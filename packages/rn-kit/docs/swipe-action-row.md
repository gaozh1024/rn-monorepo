# SwipeActionRow

`SwipeActionRow` provides a reusable swipe-to-reveal action container for list rows.

It owns the gesture, snap, close, and action surface. Business code owns the action meaning, confirmation dialog, permissions, and API calls.

## Basic Delete Action

```tsx
import { Icon, SwipeActionRow } from '@gaozh1024/rn-kit';

<SwipeActionRow
  actions={[
    {
      key: 'delete',
      label: '删除',
      icon: <Icon name="delete-outline" size={18} color="#fff" />,
      backgroundColor: '#D96C6C',
      accessibilityLabel: '删除这条记录',
      onPress: () => confirmDelete(item),
    },
  ]}
>
  <TransactionRow item={item} />
</SwipeActionRow>;
```

## Keep One Row Open

```tsx
const [openRowId, setOpenRowId] = useState<string | null>(null);

<SwipeActionRow
  open={openRowId === item.id}
  onOpen={() => setOpenRowId(item.id)}
  onClose={() => setOpenRowId(current => (current === item.id ? null : current))}
  actions={actions}
>
  <RowContent />
</SwipeActionRow>;
```

## Disable Swipe

```tsx
<SwipeActionRow disabled={!canDelete} actions={deleteActions}>
  <RowContent />
</SwipeActionRow>
```

## Props

- `actions`: Right-side actions revealed by swiping left.
- `disabled`: Disables gestures and action exposure.
- `open`: Controlled open state.
- `defaultOpen`: Initial uncontrolled open state.
- `actionWidth`: Default action width, `76`.
- `threshold`: Snap threshold, `48`.
- `overshoot`: Drag overshoot, `12`.
- `closeOnActionPress`: Close after action press, default `true`.
- `closeOnPress`: Close when pressing content while open, default `false`.

## Notes

- Use app-side confirmation for destructive actions.
- Use `open` for long lists so only one row remains open.
- In reduced-motion mode, the component avoids spring overshoot.
- Web support is native-first; use regular buttons for Web-only lists if swipe gestures are not desired.
