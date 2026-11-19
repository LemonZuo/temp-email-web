/**
 * Webhook filter rule tree. Same structure and limits as the worker's `compileFilter`
 * (`worker/src/utils/filter.ts`): logical nodes `and`/`or` have exactly two children, `not` one,
 * at most 8 levels and 100 nodes, field ≤ 100 chars, value ≤ 500 chars.
 * Regex syntax/flags are intentionally not compiled here; the backend reports those errors.
 */
export type FilterExpression = {
  operator: string
  children?: (FilterExpression | null)[]
  field?: string
  value?: string
  options?: Record<string, unknown>
}

export type FilterField = { label: string; value: string }
export type FilterOperator = FilterField & {
  options?: { key: string; label: string; placeholder?: string }[]
}

export const LOGICAL_OPERATORS = ['and', 'or', 'not'] as const
export type LogicalOperator = (typeof LOGICAL_OPERATORS)[number]

export const isLogicalOperator = (operator: string | undefined): operator is LogicalOperator =>
  !!operator && (LOGICAL_OPERATORS as readonly string[]).includes(operator)

export const MAX_FILTER_DEPTH = 8
export const MAX_FILTER_NODES = 100

/** Structural check plus operator/option/field validation for every condition node. */
export function isValidFilterExpression(
  input: unknown,
  operators: FilterOperator[],
  isFieldAllowed: (field: string) => boolean = () => true,
): boolean {
  if (input == null) return true
  return isFilterExpression(input, (node) => {
    if (!isFieldAllowed(node.field!)) return false
    const operator = operators.find((item) => item.value === node.operator)
    if (!operator) return false
    const options = node.options || {}
    if (Object.keys(options).some((key) => !operator.options?.some((option) => option.key === key))) return false
    return true
  })
}

/** Pure structure check; `checkCondition` runs on every leaf. `null` is not an expression. */
export function isFilterExpression(
  input: unknown,
  checkCondition: (node: FilterExpression) => boolean = () => true,
): input is FilterExpression {
  let nodes = 0
  const validate = (value: unknown, depth: number): boolean => {
    if (++nodes > MAX_FILTER_NODES || depth > MAX_FILTER_DEPTH || !value || typeof value !== 'object' || Array.isArray(value)) {
      return false
    }
    const node = value as FilterExpression
    if (typeof node.operator !== 'string') return false
    if (isLogicalOperator(node.operator)) {
      return (
        Object.keys(node).every((key) => ['operator', 'children'].includes(key)) &&
        Array.isArray(node.children) &&
        node.children.length === (node.operator === 'not' ? 1 : 2) &&
        node.children.every((child) => validate(child, depth + 1))
      )
    }
    return (
      Object.keys(node).every((key) => ['field', 'operator', 'value', 'options'].includes(key)) &&
      typeof node.field === 'string' &&
      typeof node.value === 'string' &&
      node.field.length <= 100 &&
      node.value.length <= 500 &&
      (node.options === undefined || (!!node.options && typeof node.options === 'object' && !Array.isArray(node.options))) &&
      checkCondition(node)
    )
  }
  try {
    return validate(input, 1)
  } catch {
    return false
  }
}
