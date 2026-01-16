"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import StudioSidebar from "./StudioSidebar";
import IdeaGenerator from "./studio/IdeaGenerator";
import ImageGenerator from "./studio/ImageGenerator";
import VideoGenerator from "./studio/VideoGenerator";
import CarouselGenerator from "./studio/CarouselGenerator";
import History from "./studio/History";
import Library from "./studio/Library";
import "./Studio.css";

const STUDIO_SECTIONS = {
  idea: "idea",
  image: "image",
  video: "video",
  carousel: "carousel",
  history: "history",
  library: "library",
};

export default function Studio() {
  const [activeSection, setActiveSection] = useState(STUDIO_SECTIONS.idea);
  const [generatorInput, setGeneratorInput] = useState(null);

  const renderContent = () => {
    switch (activeSection) {
      case STUDIO_SECTIONS.idea:
        return (
          <IdeaGenerator 
            onSwitchToGenerator={(section, input) => {
              setGeneratorInput(input);
              setActiveSection(section);
            }}
          />
        );
      case STUDIO_SECTIONS.image:
        return <ImageGenerator initialData={generatorInput} />;
      case STUDIO_SECTIONS.video:
        return <VideoGenerator initialData={generatorInput} />;
      case STUDIO_SECTIONS.carousel:
        return <CarouselGenerator />;
      case STUDIO_SECTIONS.history:
        return <History />;
      case STUDIO_SECTIONS.library:
        return <Library />;
      default:
        return <IdeaGenerator />;
    }
  };

  return (
    <div className="studio-layout">
      <StudioSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      <div className="studio-main-workspace">
        {renderContent()}
      </div>
    </div>
  );
}

