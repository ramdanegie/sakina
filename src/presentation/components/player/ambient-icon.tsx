"use client";

import {
  Bird,
  Cat,
  CloudLightning,
  CloudRain,
  Droplet,
  Feather,
  Fish,
  Flame,
  Minus,
  Moon,
  TrainFront,
  Trees,
  Waves,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Explicit icon map rather than a dynamic lookup: a static map keeps the
 * icons tree-shakeable and makes an unknown name a visible fallback instead
 * of a runtime crash.
 */
const ICONS: Readonly<Record<string, LucideIcon>> = {
  Minus,
  CloudRain,
  Bird,
  Flame,
  Waves,
  Wind,
  Droplet,
  Moon,
  CloudLightning,
  Zap,
  Feather,
  Cat,
  Fish,
  TrainFront,
  Trees,
};

export function AmbientIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICONS[name] ?? Minus;
  return <Icon className={className} aria-hidden />;
}
