---
description: Run a detailed document review using a subagent
agent: build
---

# Document Review

**Document path**: `$ARGUMENTS` (e.g. `/review-docs docs/product-requirements.md`)

## How to Run

```
opencode
> /review-docs docs/product-requirements.md
```

## Procedure

### Step 1: Verify the Document Exists

Check whether the specified document exists.

### Step 2: Launch the doc-reviewer Subagent

Launch the doc-reviewer subagent to run the review:

Use the Task tool to launch the doc-reviewer subagent:
- subagent_type: "doc-reviewer"
- description: "Document detailed review"
- prompt: "Please review $ARGUMENTS in detail.\n\nEvaluate it from the following perspectives:\n1. Completeness: Are all required items included?\n2. Specificity: Are there any ambiguous expressions?\n3. Consistency: Is it consistent with other documents?\n4. Measurability: Are success metrics measurable? (for a PRD)\n\nPlease produce a review report."

### Step 3: Summarize the Review Results

Extract the key points from the review report produced by the subagent and report them to the user.

## Output Format

```markdown
# Document Review Results

## Document: [file name]

### Key Improvements

1. [Improvement 1] (Priority: High/Medium/Low)
2. [Improvement 2] (Priority: High/Medium/Low)
3. [Improvement 3] (Priority: High/Medium/Low)

### Overall Rating

[1-5]/5

### Next Actions

- [Recommended action 1]
- [Recommended action 2]

For the full report, refer to the subagent's output.
```

## Notes

- The review involves detailed analysis and may take a few minutes.
- The subagent runs in an independent context, so it does not consume the main agent's context.
