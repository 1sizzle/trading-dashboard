// The mentor keeps two notes in MentorMemory: its pattern notes (any row) and
// the lessons the trader has taught it (this fixed row id). No schema change needed.
export const LESSONS_ID = "mentor-lessons";
export const PATTERNS_WHERE = { id: { not: LESSONS_ID } } as const;
