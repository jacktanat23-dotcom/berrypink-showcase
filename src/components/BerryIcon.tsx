export default function BerryIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      width={20}
      height={20}
      style={{ width: 20, height: 20, minWidth: 20, minHeight: 20, maxWidth: 20, maxHeight: 20 }}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ก้านผลเบอร์รี่ด้านบน (Stem) */}
      <path
        d="M12 2C12.4 3.4 13.5 4.2 15 4.5"
        stroke="#c084fc"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      
      {/* ใบเลี้ยงสีม่วงสดใส (Leaves / Calyx) */}
      <path
        d="M6.8 6.2C8.6 7 10.2 6.4 12 5.2C13.8 6.4 15.4 7 17.2 6.2C16 7.8 14.6 8.2 12 7.8C9.4 8.2 8 7.8 6.8 6.2Z"
        fill="#c084fc"
      />

      {/* เนื้อผลเบอร์รี่ไล่เฉดสีม่วง (Berry Body) */}
      <path
        d="M12 6.8C7.6 6.8 5.2 10.2 5.6 14.4C6.3 18.8 10.4 21.5 12 21.5C13.6 21.5 17.7 18.8 18.4 14.4C18.8 10.2 16.4 6.8 12 6.8Z"
        fill="url(#berry-purple-grad)"
      />

      {/* เมล็ด / จุดไฮไลท์ของผลเบอร์รี่ (Berry Seeds) */}
      <circle cx="9" cy="11.2" r="0.85" fill="#f5d0fe" />
      <circle cx="12" cy="10.6" r="0.85" fill="#f5d0fe" />
      <circle cx="15" cy="11.2" r="0.85" fill="#f5d0fe" />
      <circle cx="10.5" cy="14.3" r="0.85" fill="#f5d0fe" />
      <circle cx="13.5" cy="14.3" r="0.85" fill="#f5d0fe" />
      <circle cx="12" cy="17.5" r="0.8" fill="#f5d0fe" />

      {/* ไล่เฉดสีม่วงสวยงาม Berry Purple Gradient */}
      <defs>
        <linearGradient
          id="berry-purple-grad"
          x1="6"
          y1="7"
          x2="18"
          y2="21.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#c084fc" />
          <stop offset="0.45" stopColor="#a855f7" />
          <stop offset="1" stopColor="#7e22ce" />
        </linearGradient>
      </defs>
    </svg>
  );
}
