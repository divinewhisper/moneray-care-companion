import logo from "@/assets/moneray-logo.asset.json";

export function Logo({ className = "h-14 w-14" }: { className?: string }) {
  return (
    <img
      src={logo.url}
      alt="โลโก้ Moneray รถพยาบาลพร้อมสัญลักษณ์หัวใจ"
      className={`${className} rounded-full object-contain`}
    />
  );
}
