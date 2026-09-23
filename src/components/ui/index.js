/**
 * FILE: index.js
 * PURPOSE: Barrel export — import any UI primitive from one path.
 * CONNECTS TO: all files in src/components/ui/.
 *
 * Usage: import { Button, Card, Modal, Badge } from '@/components/ui';
 *        (or relative path depending on the page location)
 */

export { cn } from "./cn";
export { Button } from "./button";
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./card";
export { Badge } from "./badge";
export { Modal, ConfirmModal } from "./modal";
export { Input, Textarea, Select, Field } from "./input";
export { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "./table";
export { EmptyState } from "./empty-state";
export { Skeleton, SkeletonText, SkeletonCard, SkeletonTableRow } from "./skeleton";
export { PageHeader } from "./page-header";
export { PageHero, heroActionClass, heroChipClass } from "./page-hero";
export { StatCard } from "./stat-card";
export { Reveal, RevealFlat, spotlightMove } from "./reveal";
export { ThemeToggle } from "./theme-toggle";
export { getInitialTheme, applyTheme, toggleTheme } from "./theme";
