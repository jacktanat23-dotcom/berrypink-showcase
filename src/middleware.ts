import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // หากยังไม่ได้ตั้งค่า Supabase ให้ข้าม middleware เพื่อให้ dev ใช้งานดูหน้า UI ได้สะดวก
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project-ref')) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value: '', ...options });
      },
    },
  });

  const { data: { session } } = await supabase.auth.getSession();

  const isAuthPage = request.nextUrl.pathname.startsWith('/admin/login');
  const isAdminPage = request.nextUrl.pathname.startsWith('/admin') && !isAuthPage;

  // 1. ถ้ายังไม่ล็อกอินแล้วพยายามเข้าหน้า Admin ให้ Redirect ไปหน้า Login
  if (isAdminPage && !session) {
    const redirectUrl = new URL('/admin/login', request.url);
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 2. ถ้าล็อกอินแล้ว ให้ตรวจสอบ Role ในตาราง profiles
  if (session) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    // ถ้าตาราง profiles มีอยู่แล้ว ให้ตรวจสอบสิทธิ์ role อย่างเข้มงวด
    if (!error && profile) {
      const isAdmin = profile.role === 'admin';

      // หากผู้ใช้มีสิทธิ์ 'user' พยายามเข้าหน้า Admin ให้ปฏิเสธการเข้าถึงและ Redirect กลับหน้าหลักทันที
      if (isAdminPage && !isAdmin) {
        const homeUrl = new URL('/', request.url);
        homeUrl.searchParams.set('auth_error', 'unauthorized_admin');
        return NextResponse.redirect(homeUrl);
      }

      // หากเป็น Admin และเปิดหน้า Login ให้ข้ามไปที่ Dashboard
      if (isAuthPage && isAdmin) {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
    } else if (!error && !profile) {
      // มี session แต่ไม่พบ profile หรือ role ไม่ใช่ admin
      if (isAdminPage) {
        const homeUrl = new URL('/', request.url);
        homeUrl.searchParams.set('auth_error', 'unauthorized_admin');
        return NextResponse.redirect(homeUrl);
      }
    }
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
