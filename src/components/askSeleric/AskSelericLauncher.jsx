"use client";

import Image from "next/image";
import { useState } from "react";
import AskSelericModal from "./AskSelericModal";

const AskSelericLauncher = ({ size = 40 }) => {
  const [open, setOpen] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        className="ask-seleric-launcher"
        onClick={handleOpen}
        aria-label="Open Ask Seleric assistant"
      >
        <Image
          src="/assets/images/make/dashborad-09.jpg"
          alt="Ask Seleric"
          width={size}
          height={size}
        />
      </button>
      <AskSelericModal open={open} onClose={handleClose} />
    </>
  );
};

export default AskSelericLauncher;
