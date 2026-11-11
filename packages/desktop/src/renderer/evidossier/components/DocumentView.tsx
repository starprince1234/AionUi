/**
 * Structured document viewer used by material, review, comparison, draft and
 * version preview surfaces. Block ids are stable so findings and differences
 * can point at exact positions without re-parsing text.
 */
import React, { useEffect, useRef } from 'react';
import type { DocBlock, EvidDocument } from '../domain/types';

export type BlockHighlight = 'focus' | 'target' | 'added';

export const DocumentView: React.FC<{
  document: EvidDocument;
  activeBlockId?: string;
  highlight?: Record<string, BlockHighlight>;
  onBlockClick?: (blockId: string) => void;
  className?: string;
  title?: React.ReactNode;
  titleSuffix?: React.ReactNode;
}> = ({ document, activeBlockId, highlight, onBlockClick, className, title, titleSuffix }) => {
  const activeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!activeBlockId) return;
    const timer = window.setTimeout(() => {
      activeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 30);
    return () => window.clearTimeout(timer);
  }, [activeBlockId, document.id]);

  const renderBlock = (block: DocBlock) => {
    const state = block.id === activeBlockId ? 'focus' : highlight?.[block.id];
    const wrapperClass = [
      'evd-doc__block',
      state ? `evd-doc__block--${state}` : '',
      onBlockClick ? 'evd-clickable' : '',
    ]
      .filter(Boolean)
      .join(' ');
    const handleClick = onBlockClick ? () => onBlockClick(block.id) : undefined;

    const content = (() => {
      switch (block.type) {
        case 'heading': {
          const headingClassName =
            block.level === 3 ? 'evd-doc__h3' : block.level === 2 ? 'evd-doc__h2' : 'evd-doc__h1';
          return <p className={headingClassName}>{block.text}</p>;
        }
        case 'paragraph':
          return <p className='evd-doc__p'>{block.text}</p>;
        case 'list':
          return (
            <ul className='evd-doc__list'>
              {(block.items ?? []).map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          );
        case 'table':
          return (
            <table className='evd-doc__table'>
              <tbody>
                {(block.rows ?? []).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) =>
                      block.header && rowIndex === 0 ? <th key={cellIndex}>{cell}</th> : <td key={cellIndex}>{cell}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        case 'quote':
          return <blockquote className='evd-doc__quote'>{block.text}</blockquote>;
        default:
          return null;
      }
    })();

    return (
      <div
        key={block.id}
        ref={block.id === activeBlockId ? activeRef : undefined}
        className={wrapperClass}
        data-block-id={block.id}
        onClick={handleClick}
        role={onBlockClick ? 'button' : undefined}
        tabIndex={onBlockClick ? 0 : undefined}
        onKeyDown={
          onBlockClick
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onBlockClick(block.id);
                }
              }
            : undefined
        }
      >
        {content}
      </div>
    );
  };

  return (
    <div className={['evd-doc', className].filter(Boolean).join(' ')}>
      <h2 className='evd-doc__title'>
        <span>{title ?? document.title}</span>
        {titleSuffix ? (
          <span className='evd-caption' style={{ display: 'block', marginTop: 6 }}>
            {titleSuffix}
          </span>
        ) : null}
      </h2>
      {document.blocks.map(renderBlock)}
    </div>
  );
};
