"use client";

import { Icon } from "@iconify/react";
import "./StudioSidebar.css";

const STUDIO_SECTIONS = {
  idea: "idea",
  image: "image",
  video: "video",
  carousel: "carousel",
  history: "history",
  library: "library",
};

const SIDEBAR_ITEMS = [
  {
    id: STUDIO_SECTIONS.idea,
    label: "Idea Generator",
    icon: "solar:lightbulb-bolt-bold",
    group: "create",
  },
  {
    id: STUDIO_SECTIONS.image,
    label: "Image Generator",
    icon: "solar:gallery-bold",
    group: "create",
  },
  {
    id: STUDIO_SECTIONS.video,
    label: "Video Generator",
    icon: "solar:video-library-bold",
    group: "create",
  },
  {
    id: STUDIO_SECTIONS.carousel,
    label: "Carousel Generator",
    icon: "solar:layers-bold",
    group: "create",
  },
  {
    id: STUDIO_SECTIONS.history,
    label: "History",
    icon: "solar:history-bold",
    group: "manage",
  },
  {
    id: STUDIO_SECTIONS.library,
    label: "Library",
    icon: "solar:folder-bold",
    group: "manage",
  },
];

export default function StudioSidebar({ activeSection, onSectionChange }) {
  const createItems = SIDEBAR_ITEMS.filter((item) => item.group === "create");
  const manageItems = SIDEBAR_ITEMS.filter((item) => item.group === "manage");

  return (
    <div className="studio-sidebar">
      <nav className="studio-sidebar__nav">
        <div className="studio-sidebar__group">
          <div className="studio-sidebar__group-title">Create</div>
          {createItems.map((item) => (
            <button
              key={item.id}
              className={`studio-sidebar__item ${
                activeSection === item.id ? "active" : ""
              }`}
              onClick={() => onSectionChange(item.id)}
            >
              <Icon icon={item.icon} className="studio-sidebar__icon" />
              <span className="studio-sidebar__label">{item.label}</span>
              {item.badge && <span className="studio-sidebar__badge">{item.badge}</span>}
            </button>
          ))}
        </div>

        <div className="studio-sidebar__group">
          <div className="studio-sidebar__group-title">Manage</div>
          {manageItems.map((item) => (
            <button
              key={item.id}
              className={`studio-sidebar__item ${
                activeSection === item.id ? "active" : ""
              }`}
              onClick={() => onSectionChange(item.id)}
            >
              <Icon icon={item.icon} className="studio-sidebar__icon" />
              <span className="studio-sidebar__label">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

