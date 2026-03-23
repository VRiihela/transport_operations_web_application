Fix 1 — Zod schema (backend/src/routes/jobs.ts)
Change .datetime().optional().nullable() → .datetime().optional() on both scheduledStart and scheduledEnd. In Zod, .optional() already allows undefined; if you also need to accept JSON null explicitly, use .nullish() instead of both. Pick one consistently:
typescriptscheduledStart: z.string().datetime().nullish(),
scheduledEnd: z.string().datetime().nullish(),
schedulingNote: z.string().trim().max(500).optional(),
Add a date range refinement to the same schema:
typescript.refine(
  (data) => {
    if (data.scheduledStart && data.scheduledEnd) {
      return new Date(data.scheduledEnd) > new Date(data.scheduledStart);
    }
    return true;
  },
  { message: 'scheduledEnd must be after scheduledStart', path: ['scheduledEnd'] }
)

Fix 2 — UPDATE endpoint uses the same schema
The PATCH /api/jobs/:id route must also validate through a schema — create updateJobSchema that wraps the same fields with .partial() so all fields are optional on update, but the same refinements apply:
typescriptconst updateJobSchema = createJobSchema.partial().refine(/* same schedulingNote logic */);
Apply it in the PATCH handler just like POST does.

Fix 3 — Auth typing in /my endpoint
The req.user?.id optional chain is unsafe if the route already has authenticateToken middleware — at that point req.user is guaranteed. Change to req.user!.id or add a runtime guard:
typescriptif (!req.user) return res.status(401).json({ error: 'Unauthorized' });
This pattern is already used elsewhere in the codebase — match it.

Fix 4 — Trim schedulingNote consistently
Already handled by adding .trim() to the Zod field above. Make sure the updateJobSchema carries it through via .partial() — .partial() preserves field-level transforms.