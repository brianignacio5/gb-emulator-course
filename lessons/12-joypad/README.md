# Lesson 12: Joypad

`Joypad` in `src/joypad/joypad.ts` owns the button matrix and `P1` (`0xFF00`). It does not request an interrupt by itself. `onInterrupt` is the hook lesson 17 uses to call `request(INT_JOYPAD)` (bit 4, vector `0x60` from lesson 09). This lesson's tests assign that hook directly. Leave the `Button` union, the `onInterrupt` field, the bus hooks, and `Emulator` alone.

Pan Docs: https://gbdev.io/pandocs/Joypad_Input.html

## `P1`

The program writes the select bits. A read returns those bits plus the inputs for the groups that are selected.

| Bits | Role |
| --- | --- |
| 7–6 | Unused. Read as 1. |
| 5 | Select the action buttons. `0` selects them. |
| 4 | Select the d-pad. `0` selects it. |
| 3–0 | Inputs. Active-low: `0` means pressed. |

The same four input bits serve both groups.

| Bit | D-pad (bit 4 = 0) | Buttons (bit 5 = 0) |
| --- | --- | --- |
| 0 | Right | A |
| 1 | Left | B |
| 2 | Up | Select |
| 3 | Down | Start |

## `writeP1`

`writeP1` stores `value & 0x30`. Bits 0–3 are inputs, so a write leaves them unchanged. Start the stored select at `0x30`. That value selects neither group.

## `readP1`

Start the low nibble at `0x0F`. Every line reads as released until a selected button clears its bit.

If bit 4 of the stored select is 0, clear each d-pad bit whose button is down. If bit 5 is 0, clear each action-button bit whose button is down. Both groups can be selected at once. A shared bit stays clear when either button on that line is down. With neither group selected, the nibble stays `0x0F`.

Return `0xC0 | select | low`.

## `setButton`

`setButton(button, down)` stores that button. Call `onInterrupt` when `down` is true and the button was up. A release does not call it. A second call while the button is already down does not call it. Ignore the select bits here. The test presses Start with no prior `writeP1`, and the hook still runs.

## Files to edit

- `src/joypad/joypad.ts`
