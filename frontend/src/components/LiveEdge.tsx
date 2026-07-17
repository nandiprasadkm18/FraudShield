import { EdgeProps, BaseEdge, getSmoothStepPath, EdgeLabelRenderer } from "reactflow";

export default function LiveEdge({
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, style = {}, markerEnd, label, data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY,
    targetX, targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 18,
    offset: 28,
  });

  const isAmount = typeof label === "string" && label.includes("₹");
  const showLabel = data?.showLabels !== false;

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      {label && showLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`,
              background: isAmount ? "#34d399" : "rgba(10,10,10,0.9)",
              color: isAmount ? "#000" : "#86efac",
              padding: isAmount ? "2px 7px" : "2px 6px",
              borderRadius: 9999,
              fontSize: 10,
              fontWeight: isAmount ? 800 : 600,
              fontFamily: "monospace",
              letterSpacing: "0.02em",
              border: isAmount ? "none" : "1px solid #34d39944",
              pointerEvents: "all",
              whiteSpace: "nowrap",
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
