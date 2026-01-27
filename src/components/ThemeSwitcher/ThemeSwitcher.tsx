import { useState, useMemo, useCallback } from 'react';
import { useTheme, ThemeInfo } from '../../theme';
import {
  ModalContainer,
  ModalSearchInput,
  ModalList,
  ModalListItem,
  ModalFooter,
  KeyHint,
  useModalNavigation,
} from '../Modal';

interface ThemeSwitcherProps {
  onClose: () => void;
  onModalOpen?: () => void;
  onModalClose?: () => void;
}

export function ThemeSwitcher({
  onClose,
  onModalOpen,
  onModalClose,
}: ThemeSwitcherProps) {
  const [query, setQuery] = useState('');
  const { availableThemes, currentThemeName, colorScheme, setTheme } = useTheme();

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  // Filter themes by query
  const filteredThemes = useMemo(() => {
    if (!query.trim()) return availableThemes;

    const lowerQuery = query.toLowerCase();
    return availableThemes.filter(
      (theme) => theme.name.toLowerCase().includes(lowerQuery)
    );
  }, [availableThemes, query]);

  // Handle theme selection
  const handleSelect = useCallback(
    (index: number) => {
      const selectedTheme = filteredThemes[index];
      if (selectedTheme) {
        setTheme(selectedTheme.name);
        onClose();
      }
    },
    [filteredThemes, setTheme, onClose]
  );

  const { highlightedIndex, setHighlightedIndex, handleKeyDown } = useModalNavigation({
    itemCount: filteredThemes.length,
    onSelect: handleSelect,
    onClose,
  });

  // Group themes by type (dark/light) for display
  const getThemeTypeLabel = (theme: ThemeInfo) => {
    if (theme.type === 'light') return 'Light';
    if (theme.type === 'dark') return 'Dark';
    return '';
  };

  return (
    <ModalContainer onClose={onClose} onModalOpen={onModalOpen} onModalClose={onModalClose}>
      <ModalSearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search themes..."
        onKeyDown={handleKeyDown}
      />

      <ModalList isEmpty={filteredThemes.length === 0} emptyMessage="No themes found">
        {filteredThemes.map((theme, index) => {
          const isHighlighted = index === highlightedIndex;
          const isSelected = theme.name === currentThemeName;

          return (
            <ModalListItem
              key={theme.path}
              isHighlighted={isHighlighted}
              onClick={() => handleSelect(index)}
              onMouseEnter={() => setHighlightedIndex(index)}
              rightContent={
                <div className="flex items-center gap-2">
                  {theme.type && (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{
                      backgroundColor: theme.type === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.2)',
                      color: 'var(--modal-item-text-muted)'
                    }}>
                      {getThemeTypeLabel(theme)}
                    </span>
                  )}
                  {theme.source === 'user' && (
                    <span className="text-xs" style={{ color: 'var(--modal-item-text-muted)' }}>Custom</span>
                  )}
                </div>
              }
            >
              <div
                className="text-sm truncate"
                style={{
                  color: isSelected ? 'rgb(96, 165, 250)' : undefined,
                }}
              >
                {theme.name}
                {isSelected && (
                  <span className="ml-2 text-xs" style={{ color: 'var(--modal-item-text-muted)' }}>
                    (current)
                  </span>
                )}
              </div>
            </ModalListItem>
          );
        })}
      </ModalList>

      <ModalFooter>
        <div className="text-xs" style={{ color: 'var(--modal-item-text-muted)' }}>
          System: {colorScheme}
        </div>
        <div className="flex gap-4">
          <KeyHint keys={[isMac ? '⌘' : 'Ctrl', 'J/K']} label="navigate" />
          <KeyHint keys={['Enter']} label="select" />
        </div>
      </ModalFooter>
    </ModalContainer>
  );
}
