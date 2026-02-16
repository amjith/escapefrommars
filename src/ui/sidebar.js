const setText = (id, value) => {
  const element = document.getElementById(id);
  if (!element) {
    return;
  }
  element.textContent = value && value.length > 0 ? value : "-";
};

export const updateSidebar = ({ level, goal, health, controls }) => {
  setText("sidebar-level", level || "Unknown");
  setText("sidebar-goal", goal || "-");
  setText("sidebar-health", health || "-");
  setText("sidebar-controls", controls || "-");
};
