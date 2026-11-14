import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'ยังไม่ได้ตั้งค่าการเชื่อมต่อ Supabase' },
        { status: 500 }
      );
    }

    // 1. ตรวจสอบ Token ของผู้เรียก
    if (!token) {
      return NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ (Missing Authorization Token)' },
        { status: 401 }
      );
    }

    // สร้าง Client ด้วย token ของผู้เรียก เพื่อตรวจสอบสิทธิ์
    const clientSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: { user: caller }, error: callerError } = await clientSupabase.auth.getUser(token);
    if (callerError || !caller) {
      return NextResponse.json(
        { error: 'เซสชันหมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่' },
        { status: 401 }
      );
    }

    // 2. ตรวจสอบว่าผู้เรียกมีสิทธิ์เป็น Admin ในตาราง profiles หรือไม่
    const { data: callerProfile, error: profileErr } = await clientSupabase
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (profileErr || callerProfile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'สิทธิ์ไม่เพียงพอ: เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถลบสมาชิกได้' },
        { status: 403 }
      );
    }

    // 3. รับ target userId ที่ต้องการลบ
    const body = await request.json();
    const targetUserId = body.userId;

    if (!targetUserId || typeof targetUserId !== 'string') {
      return NextResponse.json(
        { error: 'กรุณาระบุรหัสผู้ใช้งาน (userId) ที่ต้องการลบ' },
        { status: 400 }
      );
    }

    // 4. ห้ามลบบัญชีของตัวเอง
    if (targetUserId === caller.id) {
      return NextResponse.json(
        { error: 'ไม่สามารถลบบัญชีของตนเองได้ เพื่อป้องกันการถูกล็อคออกจากระบบ' },
        { status: 400 }
      );
    }

    let deletedFromAuth = false;
    let deletedFromProfiles = false;
    let lastError: string | null = null;

    // 5.1 วิธีที่ 1: ลบผ่าน Supabase Service Role Key (Admin Auth API) ถ้ามี
    if (supabaseServiceKey) {
      try {
        const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { error: deleteAuthError } = await adminSupabase.auth.admin.deleteUser(targetUserId);
        if (!deleteAuthError) {
          deletedFromAuth = true;
        } else {
          lastError = deleteAuthError.message;
        }

        // ลบออกจาก profiles ด้วยเผื่อกรณีไม่ได้ ON DELETE CASCADE
        const { error: deleteProfileError } = await adminSupabase
          .from('profiles')
          .delete()
          .eq('id', targetUserId);

        if (!deleteProfileError) {
          deletedFromProfiles = true;
        }
      } catch (err: any) {
        lastError = err.message;
      }
    }

    // 5.2 วิธีที่ 2: ลบผ่าน RPC function `delete_user_by_admin`
    if (!deletedFromAuth && !deletedFromProfiles) {
      try {
        const { error: rpcError } = await clientSupabase.rpc('delete_user_by_admin', {
          target_user_id: targetUserId,
        });

        if (!rpcError) {
          deletedFromAuth = true;
          deletedFromProfiles = true;
        } else {
          lastError = rpcError.message;
        }
      } catch (err: any) {
        lastError = err.message;
      }
    }

    // 5.3 วิธีที่ 3: ลบออกจากตาราง profiles โดยตรง (ถ้ามี RLS delete policy)
    if (!deletedFromProfiles) {
      const { error: profileDelError } = await clientSupabase
        .from('profiles')
        .delete()
        .eq('id', targetUserId);

      if (!profileDelError) {
        deletedFromProfiles = true;
      } else {
        lastError = profileDelError.message;
      }
    }

    if (deletedFromAuth || deletedFromProfiles) {
      return NextResponse.json({
        success: true,
        message: 'ลบสมาชิกออกจากระบบเรียบร้อยแล้ว',
        deletedFromAuth,
        deletedFromProfiles,
      });
    }

    return NextResponse.json(
      {
        error: lastError || 'ไม่สามารถลบสมาชิกได้ กรุณาตรวจสอบว่าได้เปิดสิทธิ์หรือรันคำสั่ง SQL Migration ล่าสุดแล้ว',
      },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('API delete user error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
