export type StrokePoint = {
  type: "start" | "draw" | "end";
  x: number;
  y: number;
  color: string;
  width: number;
};