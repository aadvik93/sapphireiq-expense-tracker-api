export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({ body: req.body ?? {}, params: req.params, query: req.query });
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Request validation failed.',
          details: result.error.issues.map((issue) => ({
            field: issue.path.slice(1).join('.') || 'request',
            message: issue.message,
          })),
        },
      });
    }
    req.validated = result.data;
    next();
  };
}
