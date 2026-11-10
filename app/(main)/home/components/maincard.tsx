"use client";

import homeProp from "@/interface/home_interface";
import { SquareArrowUpRight } from "lucide-react";

const MainCard = ({ title, discription, link }: homeProp) => {
  return (
    <div className="h-full">
      <div className="flex h-full flex-col gap-3 rounded-2xl border border-white/25 bg-white/15 p-6 text-white shadow-xl backdrop-blur-md">
        <h3 className="text-2xl font-semibold">{title}</h3>
        <p className="flex-1 text-white/80">{discription}</p>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={title}
          className="self-end"
        >
          <SquareArrowUpRight size={32} />
        </a>
      </div>
    </div>
  );
};

export default MainCard;