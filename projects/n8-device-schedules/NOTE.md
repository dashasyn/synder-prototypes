# N8 · Output device schedules — design note (DATNETISR-264)

Prototype: https://dashasyn.github.io/synder-prototypes/projects/n8-device-schedules/
Integration-test context: DATNETISR-938. The final UX call is Ignat's.

Checked against the DATNETISR-264 text on 2026-10-05. Layout A (full table) is Ignat's preference;
both layouts stay in the prototype.

## 1 · Recommended placement
**Systems › Output device schedules**, the line right below Devices. It's the one place where
schedules are created, edited, switched on/off and deleted. Every other view reads from it:
- **Station details › Schedules** (new tab): the schedules that reach the station, directly or
  through a group, with *Add schedule for <station>*. That button opens the same editor with the
  station already filled in.
- **Device details › Schedules** (new card): what reaches this device, what it does there, the
  apply status, and the per-device weekly entries read back from PaxLife. It's read-only and
  links into the editor.

There is no second editor anywhere, so behaviour can't conflict.
- **Systems › Device types** (new): which schedule actions each device type supports (display
  action, PA action, persistent base audio settings). It reads from the same capability table the
  editor uses, so the two can't disagree.

**Two layouts to choose from** (switch "Layout"): **A · Full page**, a list table followed by a
full-page editor, like N8's Device list and Device details; **B · List + editor**, the list kept
in view on the left with the same editor beside it. Both use the same editor, validation and
unsaved-changes guard.

Taken from the DATNETISR-1036 concept (2026-10-02): the Device types page, the device schedule in
plain words ("Turn display off", "Set volume to 36%", with the API fields only under Show gaps),
"Leave unchanged" options with a one-line description each, and the list + editor layout as
option B.

## 2 · Full target workflow (variant 1)
- **List**: name, Active switch, targets, days, time, PA action, display action, device rollout
  status (applied / partial failure / needs re-apply).
- **Targets**: one *Stations* field with predefined Station groups and single stations together,
  the same visual as N8's Event details picker: groups first, each with a tri-state checkbox,
  its station count and a chevron that lists its stations; a picked group is one chip
  "North line (5)". The card title counts the stations reached ("Stations (5)"). The editor shows
  what the target resolves to (devices by type, and what each one gets).
- **Timing**: weekdays Sun–Sat plus a *Holidays* category, Start/End in 24-hour time. An end time
  earlier than the start runs overnight and is labelled that way. A warning shows when another
  schedule acts on the same devices at the same time.
- **PA action**: Leave unchanged, or a volume adjustment from −100 to +100% (default 0%) against
  the **station's** default volume: below 0 it runs down to silent, above 0 up to the station's
  maximum configured amplification (−100% = silent, +100% = maximum). Each station has *Base
  audio settings* in Station details (default volume, maximum amplification); every audio device
  at the station uses them. The Barix equalizer stays on the device.
- **Display action**: Leave unchanged, or Darken all displays (the displays are **turned off**,
  per Ignat 2026-10-05). DATNETISR-264 lists a third option, cut off in the copy we have, so it's
  shown disabled, *to confirm with Tuan*.
- **Holidays**: the dates in N8's central, system-wide holiday list (DATNETISR-264).
- **Device rules**: each device gets only what its type supports. ELA and Barix never get display
  power. Barix base audio settings (default volume, equalizer) are a separate, persistent card on
  the device, and are never part of a schedule.
- **States**: empty, loading, load error, field validation with an error summary, saving with
  per-device progress, success, partial failure (each device named with its reason, plus *Retry
  failed*), save error (changes kept). A guard catches unsaved changes on every navigation and on
  closing the tab.

## 3 · Feasible first step (variant 2 — phase 1, per device)
The screens and the one place stay the same. ETC stores the named schedules, resolves each target
to its devices, converts the schedule into each device's weekly entries and **replaces** that
device's schedule through the PaxLife API. Not in phase 1, but shown rather than hidden:
**Holidays** (the API is weekly only) and **ELA speakers** (skipped until PaxLife confirms
support). This is not completion of DATNETISR-264.

Proposed rule for later changes (G6): when a group gains or loses a station, or a device is added
or moved, ETC re-applies automatically. If that fails, the schedule shows *Needs re-apply*.

## 4 · API and requirement gaps to refine (toggle "Show gaps" in the prototype)
| # | Gap | Who |
|---|---|---|
| G1 | No named or central schedules in the API: ETC must own them | ETC |
| G2 | Holidays: N8 owns the system-wide list; the API is weekly only, so ETC must write dated changes around each holiday | ETC |
| G3 | Ranges → weekday/time on/off entries; overnight splits the off entry onto the next day | ETC |
| G4 | Relative volume → absolute against the station default / maximum at apply time; re-apply when either changes. Where is the maximum configured? | ETC · ISR |
| G5 | Overlapping schedules on one device: which one wins? | Product |
| G6 | Re-apply policy when group membership or device assignments change | ETC |
| G7 | Display actions beyond Darken | Tuan |
| G8 | Does ELA accept schedules, and with which fields? | PaxLife |
| G9 | Is the per-device replace atomic? What does a failed device keep? | PaxLife |
| G10 | Active/Inactive vs the API's per-device `enabled` flag when a device has several schedules | ETC |
| G11 | The API's scheduled equalizer is out of scope; the equalizer stays a base setting | Product |

Samples: station groups, schedules, ELA/Barix devices and volumes are sample data. The chrome,
Stations rows, Device list columns and Device details cards are captured from N8.
