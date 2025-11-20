import React from "react";
import { Card, Box, Typography, Chip, Table, Divider } from "@mui/joy";

const formatScore = (score) => {
  if (score === null || score === undefined) return "N/A";
  return `${Number(score).toFixed(2)}%`;
};

const ScoreOverviewCard = ({
  averageScore,
  previousAverage,
  moduleScores = [],
  oldModulesScores = [],
}) => {
  const hasPrevious = (oldModulesScores || []).length > 0;
  const oldScoreMap = new Map(
    (oldModulesScores || []).map((entry) => [
      entry?.benchmarkModule?.id,
      {
        score: entry?.score ?? null,
        name: entry?.benchmarkModule?.name,
      },
    ])
  );

  const derivedPreviousAverage = hasPrevious
    ? previousAverage ??
      (oldModulesScores.length
        ?
          oldModulesScores.reduce(
            (sum, entry) => sum + (entry?.score ?? 0),
            0
          ) /
          oldModulesScores.length
        : null)
    : null;

  const rows = moduleScores.map((module) => {
    const moduleId = module.module_id || module.moduleId || module.id;
    const previous = oldScoreMap.get(moduleId)?.score ?? null;
    return {
      id: moduleId || module.module_name,
      name:
        module.module_name || oldScoreMap.get(moduleId)?.name || "Unknown module",
      previous,
      updated: module.score,
      isNew: previous === null,
    };
  });

  return (
    <Card variant="outlined" sx={{ p: 3 }}>
      <Typography level="h4" fontWeight="bold">
        Score Comparison
      </Typography>
      <Typography level="body-sm" color="text.secondary" sx={{ mb: 3 }}>
        Review how each rerun module performed compared to the previous version.
      </Typography>

      <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap", mb: 3 }}>
        {hasPrevious && (
          <Box>
            <Typography level="body-sm" color="text.secondary">
              Previous average
            </Typography>
            <Typography level="h3" fontWeight="bold">
              {formatScore(derivedPreviousAverage)}
            </Typography>
          </Box>
        )}
        <Box>
          <Typography level="body-sm" color="text.secondary">
            {hasPrevious ? "Updated average" : "Current average"}
          </Typography>
          <Typography level="h3" fontWeight="bold" color="success">
            {formatScore(averageScore)}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {rows.length === 0 ? (
        <Typography level="body-sm" color="text.secondary">
          No module scores were returned for this update.
        </Typography>
      ) : (
        <Table borderAxis="bothBetween" size="sm" aria-label="score comparison">
          <thead>
            <tr>
              <th style={{ width: hasPrevious ? "60%" : "70%" }}>Module</th>
              {hasPrevious && <th style={{ width: "20%" }}>Previous</th>}
              <th style={{ width: hasPrevious ? "20%" : "30%" }}>
                {hasPrevious ? "Updated" : "Score"}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography level="body-md" fontWeight="bold">
                      {row.name}
                    </Typography>
                    {hasPrevious && row.isNew && (
                      <Chip size="sm" color="success" variant="soft">
                        New
                      </Chip>
                    )}
                  </Box>
                </td>
                {hasPrevious && <td>{formatScore(row.previous)}</td>}
                <td>{formatScore(row.updated)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
};

export default ScoreOverviewCard;
