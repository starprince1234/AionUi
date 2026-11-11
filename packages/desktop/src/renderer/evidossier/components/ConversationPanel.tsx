/**
 * Package conversation panel.
 *
 * The conversation is the working discussion for a package — it never replaces
 * the stage artifacts or formal versions. Simulated assistant messages are
 * explicitly labelled so the demo never pretends real AI output.
 */
import { Button, Input } from '@arco-design/web-react';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ConversationMessage } from '../domain/types';
import { formatDateTime, MonoId, DemoTag } from '../design/primitives';
import { IconSparkle } from '../design/icons';

export const ConversationPanel: React.FC<{
  messages: ConversationMessage[];
  onSend?: (text: string) => Promise<boolean> | boolean;
  disabled?: boolean;
  placeholder?: string;
  emptyTitle?: string;
  emptyText?: string;
  /** Show a small simulated-execution notice above the composer. */
  executionRunning?: boolean;
  compact?: boolean;
}> = ({ messages, onSend, disabled, placeholder, emptyTitle, emptyText, executionRunning, compact }) => {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const streamRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = streamRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  const submit = async () => {
    const value = text.trim();
    if (!value || !onSend || sending) return;
    setSending(true);
    try {
      const ok = await onSend(value);
      if (ok !== false) setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className='evd-conversation'>
      <div className='evd-conversation__stream' ref={streamRef}>
        {messages.length === 0 ? (
          <div className='evd-empty'>
            <p className='evd-empty__title'>{emptyTitle ?? t('evidossierCommon.common.empty')}</p>
            <p className='evd-empty__text'>{emptyText}</p>
          </div>
        ) : (
          messages.map((message) => {
            if (message.role === 'system') {
              return (
                <div className='evd-msg__system' key={message.id}>
                  <span>{message.text}</span>
                </div>
              );
            }
            const isUser = message.role === 'user';
            return (
              <div key={message.id} className={isUser ? 'evd-msg evd-msg--user' : 'evd-msg evd-msg--assistant'}>
                <div className='evd-msg__meta'>
                  <span>
                    {isUser ? t('evidossierCommon.common.you') : t('evidossierCommon.demo.executionSimulated')}
                  </span>
                  <MonoId>{formatDateTime(message.createdAt)}</MonoId>
                  {message.simulated ? <DemoTag>{t('evidossierCommon.common.simulated')}</DemoTag> : null}
                </div>
                {!isUser ? (
                  <span className='evd-mr-8' style={{ color: 'var(--evd-blue)', marginRight: 4 }}>
                    <IconSparkle size={12} />
                  </span>
                ) : null}
                <p className='evd-msg__text'>{message.text}</p>
              </div>
            );
          })
        )}
      </div>
      {executionRunning ? (
        <div className='evd-composer' style={{ borderTop: 0, paddingBottom: 0 }}>
          <div className='evd-banner evd-banner--info' style={{ padding: '8px 12px' }}>
            <span className='evd-banner__icon'>◷</span>
            <div className='evd-banner__body'>
              <p className='evd-banner__text' style={{ margin: 0 }}>
                {t('evidossierCommon.demo.executionSimulated')}
              </p>
            </div>
          </div>
        </div>
      ) : null}
      <div className='evd-composer'>
        <Input.TextArea
          value={text}
          onChange={setText}
          disabled={disabled}
          placeholder={
            disabled
              ? t('evidossierCommon.common.readOnly')
              : (placeholder ?? t('evidossierCommon.common.noAdditionalInfo'))
          }
          autoSize={{ minRows: compact ? 2 : 3, maxRows: 6 }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void submit();
            }
          }}
        />
        <div className='evd-composer__hint'>
          <Button
            type='primary'
            size='small'
            loading={sending}
            disabled={disabled || !text.trim()}
            onClick={() => void submit()}
          >
            {t('evidossierCommon.action.send')}
          </Button>
          <span>Ctrl / ⌘ + Enter</span>
          <span style={{ marginLeft: 'auto' }}>{t('evidossierCommon.demo.mockArtifact')}</span>
        </div>
      </div>
    </div>
  );
};
