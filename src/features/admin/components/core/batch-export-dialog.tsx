import { useState } from 'react'
import { DownloadIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { loginUrl } from './helpers'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: {
    title: '导出登录链接',
    description: '共 {n} 个邮箱',
    spreadsheet: '电子表格安全 CSV（Excel、Google 表格）',
    spreadsheetTip:
      "以 =、+、-、@、制表符或回车开头的单元格会加上前导 '，使表格软件将其作为文本显示。程序读取此文件时，' 会成为值的一部分。",
    raw: '无损 CSV（脚本和程序）',
    rawTip: '标准 CSV，原样保留地址和登录链接。如果地址以 =、+、- 或 @ 开头，请勿用表格软件打开。',
    download: '下载 CSV',
  },
  en: {
    title: 'Export login links',
    description: '{n} mailboxes',
    spreadsheet: 'Spreadsheet-safe CSV (Excel, Google Sheets)',
    spreadsheetTip:
      "Cells that start with =, +, -, @, tab or carriage return get a leading ' so spreadsheets keep them as text. Programs reading this file will see the ' as part of the value.",
    raw: 'Lossless CSV (scripts and programs)',
    rawTip:
      'Standard CSV with the original addresses and login links unchanged. Do not open it in a spreadsheet if an address starts with =, +, - or @.',
    download: 'Download CSV',
  },
})

export type BatchCredentialRow = { address: string; jwt: string }

const quote = (value: string, spreadsheetSafe: boolean) => {
  let text = String(value)
  // Leading ' keeps spreadsheets from evaluating a cell (e.g. an =PREFIX address) as a formula.
  if (spreadsheetSafe) text = text.replace(/^[=+\-@\t\r]/, "'$&")
  return `"${text.replace(/"/g, '""')}"`
}

const downloadCsv = (rows: BatchCredentialRow[], spreadsheetSafe: boolean) => {
  const table = [['address', 'login_url'], ...rows.map((row) => [row.address, loginUrl(row.jwt)])]
  const csv = table.map((row) => row.map((value) => quote(value, spreadsheetSafe)).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = spreadsheetSafe ? 'mailbox-login-links.csv' : 'mailbox-login-links-raw.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** CSV export of batch-created mailboxes (address + auto-login link). */
export function BatchExportDialog({
  open,
  onOpenChange,
  rows,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  rows: BatchCredentialRow[]
}) {
  const t = useT(messages)
  const [mode, setMode] = useState<'spreadsheet' | 'raw'>('spreadsheet')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description', { n: rows.length })}</DialogDescription>
        </DialogHeader>
        <RadioGroup value={mode} onValueChange={(v) => setMode(v as typeof mode)} className="gap-3">
          {(['spreadsheet', 'raw'] as const).map((value) => (
            <Label
              key={value}
              htmlFor={`batch-export-${value}`}
              className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal has-data-[state=checked]:border-primary/40 has-data-[state=checked]:bg-primary/5"
            >
              <RadioGroupItem value={value} id={`batch-export-${value}`} className="mt-0.5" />
              <span className="grid gap-1">
                <span className="text-sm font-medium">{t(value)}</span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  {t(value === 'spreadsheet' ? 'spreadsheetTip' : 'rawTip')}
                </span>
              </span>
            </Label>
          ))}
        </RadioGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('close')}
          </Button>
          <Button disabled={!rows.length} onClick={() => downloadCsv(rows, mode === 'spreadsheet')}>
            <DownloadIcon />
            {t('download')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
