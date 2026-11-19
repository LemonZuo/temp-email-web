import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldSeparator } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Page, PageHeader, Section } from '@/components/common/page'
import { usePrefs } from '@/store/prefs'
import { LOCALES, isLocale, setLocale, useLocale, defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: {
    title: '偏好设置',
    description: '这些设置保存在当前浏览器中。',
    appearance: '外观',
    themeDesc: '浅色、深色或跟随系统。',
    languageDesc: '界面显示语言。',
    reading: '阅读',
    autoLoadRemoteImages: '自动加载远程图片',
    autoLoadRemoteImagesDesc: '关闭时会拦截邮件中的外部图片和追踪像素，可逐封手动加载。',
    preferShowTextMail: '默认以纯文本显示邮件',
    preferShowTextMailDesc: '打开邮件时优先显示纯文本正文。',
    previewLines: '列表正文预览行数',
    previewLinesDesc: '邮件列表中每封邮件显示的摘要行数。',
    off: '关闭',
    useUTCDate: '使用 UTC 时间',
    useUTCDateDesc: '以 UTC 而不是本地时区显示时间。',
    refresh: '刷新',
    autoRefresh: '自动刷新收件箱',
    autoRefreshDesc: '定时拉取新邮件。',
    autoRefreshInterval: '自动刷新间隔（秒）',
  },
  en: {
    title: 'Preferences',
    description: 'Stored in this browser.',
    appearance: 'Appearance',
    themeDesc: 'Light, dark, or follow the system.',
    languageDesc: 'Interface language.',
    reading: 'Reading',
    autoLoadRemoteImages: 'Load remote images automatically',
    autoLoadRemoteImagesDesc: 'When off, external images and tracking pixels are blocked; load them per mail.',
    preferShowTextMail: 'Show plain text by default',
    preferShowTextMailDesc: 'Open mails in plain-text view.',
    previewLines: 'Preview lines in list',
    previewLinesDesc: 'Lines of body preview shown for each mail in the list.',
    off: 'Off',
    useUTCDate: 'Use UTC time',
    useUTCDateDesc: 'Show times in UTC instead of your local time zone.',
    refresh: 'Refresh',
    autoRefresh: 'Auto refresh inbox',
    autoRefreshDesc: 'Poll for new mail periodically.',
    autoRefreshInterval: 'Auto refresh interval (seconds)',
  },
})

function SwitchRow({ id, label, description, checked, onChange }: { id: string; label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Field orientation="horizontal">
      <FieldContent>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <FieldDescription>{description}</FieldDescription>
      </FieldContent>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </Field>
  )
}

/** `/preferences` — local display preferences. */
export default function PreferencesPage() {
  const t = useT(messages)
  const prefs = usePrefs()
  const { theme, setTheme } = useTheme()
  const locale = useLocale()
  return (
    <Page>
      <PageHeader title={t('title')} description={t('description')} />
      <Section title={t('appearance')}>
        <FieldGroup>
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel>{t('theme')}</FieldLabel>
              <FieldDescription>{t('themeDesc')}</FieldDescription>
            </FieldContent>
            <ToggleGroup type="single" variant="outline" size="sm" value={theme} onValueChange={(v) => v && setTheme(v)}>
              <ToggleGroupItem value="light" aria-label={t('light')}>
                <SunIcon />
              </ToggleGroupItem>
              <ToggleGroupItem value="dark" aria-label={t('dark')}>
                <MoonIcon />
              </ToggleGroupItem>
              <ToggleGroupItem value="system" aria-label={t('system')}>
                <MonitorIcon />
              </ToggleGroupItem>
            </ToggleGroup>
          </Field>
          <FieldSeparator />
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel>{t('language')}</FieldLabel>
              <FieldDescription>{t('languageDesc')}</FieldDescription>
            </FieldContent>
            <Select value={locale} onValueChange={(v) => isLocale(v) && setLocale(v)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCALES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>
      </Section>
      <Section title={t('reading')}>
        <FieldGroup>
          <SwitchRow
            id="pref-remote"
            label={t('autoLoadRemoteImages')}
            description={t('autoLoadRemoteImagesDesc')}
            checked={prefs.autoLoadRemoteImages}
            onChange={(v) => prefs.set({ autoLoadRemoteImages: v })}
          />
          <FieldSeparator />
          <SwitchRow
            id="pref-text"
            label={t('preferShowTextMail')}
            description={t('preferShowTextMailDesc')}
            checked={prefs.preferShowTextMail}
            onChange={(v) => prefs.set({ preferShowTextMail: v })}
          />
          <FieldSeparator />
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel>{t('previewLines')}</FieldLabel>
              <FieldDescription>{t('previewLinesDesc')}</FieldDescription>
            </FieldContent>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={String(prefs.previewLines)}
              onValueChange={(v) => v && prefs.set({ previewLines: Number(v) })}
            >
              <ToggleGroupItem value="0">{t('off')}</ToggleGroupItem>
              <ToggleGroupItem value="1">1</ToggleGroupItem>
              <ToggleGroupItem value="2">2</ToggleGroupItem>
              <ToggleGroupItem value="3">3</ToggleGroupItem>
            </ToggleGroup>
          </Field>
          <FieldSeparator />
          <SwitchRow
            id="pref-utc"
            label={t('useUTCDate')}
            description={t('useUTCDateDesc')}
            checked={prefs.useUTCDate}
            onChange={(v) => prefs.set({ useUTCDate: v })}
          />
        </FieldGroup>
      </Section>
      <Section title={t('refresh')}>
        <FieldGroup>
          <SwitchRow
            id="pref-auto-refresh"
            label={t('autoRefresh')}
            description={t('autoRefreshDesc')}
            checked={prefs.autoRefresh}
            onChange={(v) => prefs.set({ autoRefresh: v })}
          />
          <Field orientation="horizontal" data-disabled={!prefs.autoRefresh || undefined}>
            <FieldContent>
              <FieldLabel htmlFor="pref-interval">{t('autoRefreshInterval')}</FieldLabel>
            </FieldContent>
            <Input
              id="pref-interval"
              type="number"
              min={5}
              max={3600}
              className="w-28"
              disabled={!prefs.autoRefresh}
              value={prefs.autoRefreshInterval}
              onChange={(e) => {
                const n = Math.round(Number(e.target.value))
                if (Number.isFinite(n)) prefs.set({ autoRefreshInterval: Math.min(3600, Math.max(5, n)) })
              }}
            />
          </Field>
        </FieldGroup>
      </Section>
    </Page>
  )
}
