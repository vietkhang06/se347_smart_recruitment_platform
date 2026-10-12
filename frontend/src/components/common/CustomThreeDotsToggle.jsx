import { forwardRef } from "react";

/**
 * Custom Dropdown Toggle with 3 vertical dots icon.
 * Styled with theme-aware background, subtle hover effect, and clean border radius.
 */
export const CustomThreeDotsToggle = forwardRef(({ onClick }, ref) => (
  <button
    ref={ref}
    type="button"
    className="btn btn-sm border-0 rounded-circle p-0 d-inline-flex align-items-center justify-content-center transition-all"
    style={{
      width: "32px",
      height: "32px",
      backgroundColor: "var(--surface-2)",
      color: "var(--text)"
    }}
    onClick={(e) => {
      e.preventDefault();
      onClick(e);
    }}
    title="Thao tác"
    aria-label="Thao tác"
  >
    <i className="bi bi-three-dots-vertical fs-6"></i>
  </button>
));

CustomThreeDotsToggle.displayName = "CustomThreeDotsToggle";

export default CustomThreeDotsToggle;
