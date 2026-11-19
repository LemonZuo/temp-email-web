import { defineMessages } from '@/i18n'

/** Strings shared by the admin settings building blocks. */
export const settingsMessages = defineMessages({
  zh: {
    unsavedChanges: '有未保存的更改',
    unsavedChangesHint: '保存后生效',
    discard: '放弃更改',
    leaveTitle: '放弃未保存的更改？',
    leaveDescription: '离开此页面后，未保存的更改将丢失。',
    leave: '离开',
    loadFailed: '加载失败',
    retry: '重试',
    manualInputPrompt: '输入后按回车键添加',
    removeItem: '移除 {item}',
    clearAll: '清空',
    itemCount: '{n} 项',
    suggestions: '建议',
  },
  en: {
    unsavedChanges: 'You have unsaved changes',
    unsavedChangesHint: 'Changes take effect after saving',
    discard: 'Discard',
    leaveTitle: 'Discard unsaved changes?',
    leaveDescription: 'Your unsaved changes will be lost if you leave this page.',
    leave: 'Leave',
    loadFailed: 'Failed to load',
    retry: 'Retry',
    manualInputPrompt: 'Type and press Enter to add',
    removeItem: 'Remove {item}',
    clearAll: 'Clear',
    itemCount: '{n} items',
    suggestions: 'Suggestions',
  },
})
