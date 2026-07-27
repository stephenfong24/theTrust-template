import cnbLogo from "../../assets/cnb-logo.png";

export function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className={collapsed ? "flex w-full items-center justify-center" : "flex min-w-0 items-center"}>
      <img
        src={cnbLogo}
        alt="CNB Amanah Berhad"
        className={collapsed ? "h-9 w-10 rounded-md object-contain" : "h-12 w-44 object-contain object-left"}
      />
    </div>
  );
}
