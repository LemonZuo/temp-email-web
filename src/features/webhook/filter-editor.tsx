import { useEffect, useMemo, useState } from 'react'
import { BracesIcon, ChevronsUpDownIcon, ListTreeIcon, PlusIcon, XIcon } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import { defineMessages, useT } from '@/i18n'
import {
  MAX_FILTER_DEPTH,
  isLogicalOperator,
  isValidFilterExpression,
  type FilterExpression,
  type FilterField,
  type FilterOperator,
} from './filter'

const messages = defineMessages({
  zh: {
    hint: '未设置条件时全部通过',
    visual: '可视化',
    invalid: '规则无效，请检查结构、操作符、选项和正则；最多 8 层、100 个节点',
    and: '与：全部满足',
    or: '或：任一满足',
    not: '非：取反',
    andShort: '且',
    orShort: '或',
    notShort: '非',
    logic: '规则类型',
    condition: '匹配条件',
    remove: '移除',
    field: '字段',
    operator: '操作符',
    value: '匹配值',
    addRule: '添加规则',
    useCustomField: '使用 “{field}”',
    noField: '没有匹配的字段',
  },
  en: {
    hint: 'No conditions: match everything',
    visual: 'Visual',
    invalid: 'Invalid rule: check structure, operators, options and regex. Maximum 8 levels and 100 nodes.',
    and: 'AND: all match',
    or: 'OR: any match',
    not: 'NOT: negate',
    andShort: 'AND',
    orShort: 'OR',
    notShort: 'NOT',
    logic: 'Rule type',
    condition: 'Condition',
    remove: 'Remove',
    field: 'Field',
    operator: 'Operator',
    value: 'Value',
    addRule: 'Add rule',
    useCustomField: 'Use “{field}”',
    noField: 'No matching field',
  },
})

type NodeType = 'condition' | 'and' | 'or' | 'not'
const NODE_TYPES: NodeType[] = ['condition', 'and', 'or', 'not']

type EditorContext = {
  fields: FilterField[]
  operators: FilterOperator[]
  allowCustomFields: boolean
}

export type FilterEditorProps = {
  value: FilterExpression | null | undefined
  onChange: (value: FilterExpression | null) => void
  fields: FilterField[]
  operators: FilterOperator[]
  /** Allow typing fields that are not in `fields` (validated by `isFieldAllowed`) */
  allowCustomFields?: boolean
  /** Defaults to "field is one of `fields`" */
  isFieldAllowed?: (field: string) => boolean
  /** Reports `rules valid && JSON draft parses` */
  onValidityChange?: (valid: boolean) => void
  className?: string
}

/** Rule-tree editor with a visual mode and a raw JSON mode. */
export function FilterEditor({
  value,
  onChange,
  fields,
  operators,
  allowCustomFields = false,
  isFieldAllowed,
  onValidityChange,
  className,
}: FilterEditorProps) {
  const t = useT(messages)
  const [mode, setMode] = useState<'visual' | 'json'>('visual')
  const [json, setJson] = useState('')
  const [jsonError, setJsonError] = useState(false)

  const validate = (input: unknown) =>
    isValidFilterExpression(input, operators, (field) =>
      isFieldAllowed ? isFieldAllowed(field) : fields.some((item) => item.value === field),
    )
  const rulesValid = validate(value)
  const valid = rulesValid && !jsonError

  useEffect(() => {
    onValidityChange?.(valid)
  }, [valid, onValidityChange])

  const changeMode = (next: string) => {
    if (next !== 'visual' && next !== 'json') return
    setMode(next)
    setJson(JSON.stringify(value ?? null, null, 2))
  }

  const editJson = (text: string) => {
    setJson(text)
    try {
      const parsed: unknown = JSON.parse(text)
      if (!validate(parsed)) throw new Error('Invalid expression')
      setJsonError(false)
      onChange(parsed as FilterExpression | null)
    } catch {
      setJsonError(true)
    }
  }

  const ctx = useMemo<EditorContext>(() => ({ fields, operators, allowCustomFields }), [fields, operators, allowCustomFields])

  return (
    <div className={cn('grid min-w-0 gap-3', className)} data-testid="filter-editor">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{value ? null : t('hint')}</span>
        <ToggleGroup type="single" variant="outline" size="sm" spacing={0} value={mode} onValueChange={changeMode}>
          <ToggleGroupItem value="visual" disabled={jsonError} aria-label={t('visual')}>
            <ListTreeIcon />
            {t('visual')}
          </ToggleGroupItem>
          <ToggleGroupItem value="json" aria-label="JSON">
            <BracesIcon />
            JSON
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {mode === 'json' ? (
        <div className="grid gap-1.5">
          <Textarea
            value={json}
            onChange={(e) => editJson(e.target.value)}
            aria-label="JSON"
            aria-invalid={jsonError || undefined}
            spellCheck={false}
            rows={10}
            className="max-h-[480px] min-h-40 font-mono text-xs"
          />
          {jsonError && <p className="text-sm text-destructive">{t('invalid')}</p>}
        </div>
      ) : (
        <>
          {!rulesValid && (
            <Alert variant="destructive">
              <AlertDescription>{t('invalid')}</AlertDescription>
            </Alert>
          )}
          <div className="rounded-lg border bg-muted/20 p-3">
            <FilterNode value={value ?? null} onChange={onChange} depth={1} ctx={ctx} />
          </div>
        </>
      )}
    </div>
  )
}

function FilterNode({
  value,
  onChange,
  depth,
  ctx,
}: {
  value: FilterExpression | null
  onChange: (value: FilterExpression | null) => void
  depth: number
  ctx: EditorContext
}) {
  const t = useT(messages)
  if (depth > MAX_FILTER_DEPTH) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t('invalid')}</AlertDescription>
      </Alert>
    )
  }

  const group = !!value && isLogicalOperator(value.operator)
  const nodeType: NodeType | null = !value ? null : group ? (value.operator as NodeType) : 'condition'

  const patch = (next: Partial<FilterExpression>) => onChange({ ...value!, ...next })

  const changeType = (type: string) => {
    if (type === nodeType) return
    if (type === 'condition') {
      onChange({ field: '', operator: '', value: '' })
      return
    }
    const keepChildren = (type === 'and' || type === 'or') && (nodeType === 'and' || nodeType === 'or')
    const children = keepChildren ? value!.children : Array<FilterExpression | null>(type === 'not' ? 1 : 2).fill(null)
    onChange({ operator: type, children })
  }

  const updateChild = (index: number, child: FilterExpression | null) => {
    const children = [...(value?.children || [])]
    children[index] = child
    patch({ children })
  }

  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex items-center gap-2">
        <Select value={nodeType ?? ''} onValueChange={changeType}>
          <SelectTrigger size="sm" className="w-40 sm:w-44" aria-label={t('logic')}>
            {nodeType ? (
              <SelectValue />
            ) : (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <PlusIcon className="size-3.5" />
                {depth === 1 ? t('addRule') : t('logic')}
              </span>
            )}
          </SelectTrigger>
          <SelectContent>
            {NODE_TYPES.map((type) => (
              <SelectItem key={type} value={type} disabled={depth >= MAX_FILTER_DEPTH && type !== 'condition'}>
                {t(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            aria-label={t('remove')}
            onClick={() => onChange(null)}
          >
            <XIcon />
            <span className="hidden sm:inline">{t('remove')}</span>
          </Button>
        )}
      </div>

      {group &&
        value.children?.map((child, index) => (
          <div key={index} className="grid gap-2">
            {index > 0 && value.operator !== 'not' && (
              <span className="w-fit rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-primary uppercase">
                {t(value.operator === 'and' ? 'andShort' : 'orShort')}
              </span>
            )}
            <div className="border-l-2 border-primary/25 pl-3 sm:pl-4">
              <FilterNode value={child} onChange={(next) => updateChild(index, next)} depth={depth + 1} ctx={ctx} />
            </div>
          </div>
        ))}

      {value && !group && <ConditionInputs value={value} onChange={onChange} ctx={ctx} />}
    </div>
  )
}

function ConditionInputs({
  value,
  onChange,
  ctx,
}: {
  value: FilterExpression
  onChange: (value: FilterExpression) => void
  ctx: EditorContext
}) {
  const t = useT(messages)
  const operator = ctx.operators.find((item) => item.value === value.operator)
  const operatorOptions = operator?.options || []

  const patch = (next: Partial<FilterExpression>) => onChange({ ...value, ...next })
  // Changing the operator drops operator-specific options (same as the old editor).
  const setOperator = (op: string) => onChange({ field: value.field, operator: op, value: value.value || '' })
  const setOption = (key: string, optionValue: unknown) => patch({ options: { ...value.options, [key]: optionValue } })

  return (
    <div className="grid gap-2">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)]">
        <FieldPicker
          value={value.field || ''}
          fields={ctx.fields}
          allowCustom={ctx.allowCustomFields}
          onChange={(field) => patch({ field })}
        />
        <Select value={value.operator || ''} onValueChange={setOperator}>
          <SelectTrigger className="w-full" aria-label={t('operator')}>
            <SelectValue placeholder={t('operator')} />
          </SelectTrigger>
          <SelectContent>
            {ctx.operators.map((op) => (
              <SelectItem key={op.value} value={op.value}>
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={value.value ?? ''}
          placeholder={t('value')}
          aria-label={t('value')}
          maxLength={500}
          onChange={(e) => patch({ value: e.target.value })}
        />
      </div>
      {operatorOptions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {operatorOptions.map((option) => (
            <Input
              key={option.key}
              className="h-8 w-full sm:w-48"
              value={String(value.options?.[option.key] || '')}
              placeholder={option.placeholder || option.label}
              aria-label={option.label}
              onChange={(e) => setOption(option.key, e.target.value)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/** Searchable field select; with `allowCustom` any typed text can be used (e.g. `header.List-ID`). */
function FieldPicker({
  value,
  fields,
  allowCustom,
  onChange,
}: {
  value: string
  fields: FilterField[]
  allowCustom: boolean
  onChange: (value: string) => void
}) {
  const t = useT(messages)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const known = fields.find((f) => f.value === value)
  const typed = search.trim()
  const showCustom = allowCustom && !!typed && !fields.some((f) => f.value === typed)

  const select = (next: string) => {
    onChange(next)
    setOpen(false)
    setSearch('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={t('field')}
          className="w-full justify-between px-2.5 font-normal"
        >
          {known ? (
            <span className="truncate">{known.label}</span>
          ) : value ? (
            <span className="truncate font-mono text-xs">{value}</span>
          ) : (
            <span className="truncate text-muted-foreground">{t('field')}</span>
          )}
          <ChevronsUpDownIcon className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-56 p-0" align="start">
        <Command>
          <CommandInput value={search} onValueChange={setSearch} placeholder={allowCustom ? 'header.List-ID' : t('field')} />
          <CommandList>
            <CommandEmpty>{t('noField')}</CommandEmpty>
            <CommandGroup>
              {fields.map((field) => (
                <CommandItem
                  key={field.value}
                  value={`${field.label} ${field.value}`}
                  data-checked={field.value === value}
                  onSelect={() => select(field.value)}
                >
                  <span className="truncate">{field.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">{field.value}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            {showCustom && (
              <CommandGroup forceMount>
                <CommandItem value={`custom:${typed}`} onSelect={() => select(typed)} forceMount>
                  <PlusIcon />
                  <span className="truncate">{t('useCustomField', { field: typed })}</span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
