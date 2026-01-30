import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useContentPanelContext } from './ContentPanelProvider';
import type { ContentTab, ContentTabType } from './types';

// Tab type icons
function TerminalIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="12" height="10" rx="1" />
      <path d="M5 7l2 2-2 2" />
      <path d="M9 11h2" />
    </svg>
  );
}

function EditorIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 2H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V6L9 2z" />
      <path d="M9 2v4h4" />
    </svg>
  );
}

function ReviewIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="5" />
      <path d="M8 5v3l2 1" />
    </svg>
  );
}

function BrowserIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="12" height="10" rx="1" />
      <path d="M2 6h12" />
      <circle cx="4" cy="4.5" r="0.5" fill="currentColor" />
      <circle cx="6" cy="4.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

export function TabIcon({
  type,
  size = 14,
}: {
  type: ContentTabType;
  size?: number;
}) {
  switch (type) {
    case 'terminal':
      return <TerminalIcon size={size} />;
    case 'editor':
      return <EditorIcon size={size} />;
    case 'review':
      return <ReviewIcon size={size} />;
    case 'browser':
      return <BrowserIcon size={size} />;
    default:
      return <TerminalIcon size={size} />;
  }
}

// Close button for tabs
function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="flex items-center justify-center w-4 h-4 rounded transition-colors ml-0.5 opacity-60 hover:bg-accent"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title="Close"
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M2 2l6 6M8 2l-6 6" />
      </svg>
    </button>
  );
}

// Single tab item
interface ContentTabItemProps {
  tab: ContentTab;
  isActive: boolean;
  onClose?: () => void;
}

export function ContentTabItem({
  tab,
  isActive,
  onClose,
}: ContentTabItemProps) {
  const { setActiveTab } = useContentPanelContext();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      className={`
        flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-md cursor-pointer transition-colors
        ${isDragging ? 'opacity-50' : 'opacity-100'}
        ${isActive ? 'text-foreground bg-muted border border-border' : 'text-muted-foreground border border-transparent hover:bg-accent'}
      `}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => setActiveTab(tab.id)}
    >
      <TabIcon type={tab.type} size={14} />
      <span>{tab.name}</span>
      {onClose && <CloseButton onClick={onClose} />}
    </div>
  );
}

// Tab bar component
export function ContentTabBar() {
  const { tabs, activeTabId, closeTab, reorderTabs } = useContentPanelContext();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = tabs.findIndex((t) => t.id === active.id);
      const newIndex = tabs.findIndex((t) => t.id === over.id);
      reorderTabs(oldIndex, newIndex);
    }
  };

  return (
    <div className="flex items-center gap-1 px-2 py-2 border-b border-border">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={tabs.map((t) => t.id)}
          strategy={horizontalListSortingStrategy}
        >
          {tabs.map((tab) => (
            <ContentTabItem
              key={tab.id}
              tab={tab}
              isActive={activeTabId === tab.id}
              onClose={tabs.length > 1 ? () => closeTab(tab.id) : undefined}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Add tab menu */}
      <AddTabButton />
    </div>
  );
}

// Add tab button with dropdown
import { useEffect, useRef, useState } from 'react';
import { SINGLETON_TAB_TYPES, TAB_TYPE_OPTIONS } from './types';

function AddTabButton() {
  const { addTab, tabs } = useContentPanelContext();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleAddTab = (type: ContentTabType) => {
    const name = type.charAt(0).toUpperCase() + type.slice(1);

    switch (type) {
      case 'terminal':
        addTab({ type: 'terminal', name, ptyId: null });
        break;
      case 'editor':
        addTab({ type: 'editor', name, filePath: '', isDirty: false });
        break;
      case 'review':
        addTab({ type: 'review', name, reviewId: '', title: '' });
        break;
      case 'browser':
        addTab({ type: 'browser', name });
        break;
    }

    setIsOpen(false);
  };

  // Check which singleton types already exist
  const isTypeDisabled = (type: ContentTabType): boolean => {
    if (!SINGLETON_TAB_TYPES.includes(type)) return false;
    return tabs.some((t) => t.type === type);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        className="flex items-center justify-center w-7 h-7 rounded-md transition-colors text-muted-foreground bg-muted hover:bg-accent"
        onClick={() => setIsOpen(!isOpen)}
        title="New Tab"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M7 2v10M2 7h10" />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="absolute top-full left-0 mt-1 py-1 rounded-md shadow-lg z-50 bg-popover border border-border min-w-[120px]"
        >
          {TAB_TYPE_OPTIONS.map((option) => {
            const disabled = isTypeDisabled(option.type);
            return (
              <button
                key={option.type}
                className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left transition-colors text-foreground ${
                  disabled
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-accent cursor-pointer'
                }`}
                disabled={disabled}
                onClick={() => !disabled && handleAddTab(option.type)}
              >
                <TabIcon type={option.type} size={14} />
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
