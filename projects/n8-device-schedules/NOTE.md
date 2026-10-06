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
plain words ("Turn display off", "Set volume to 30%"),
"Leave unchanged" options with a one-line description each, and the list + editor layout as
option B.

## 2 · Full target workflow
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
- **Layout** (Ignat's sketches, 2026-10-05): name + Active switch in one row; **Stations** and
  **Schedule** cards side by side, like N8's Event details; **Actions** below with two dropdowns.
  No explanatory helper text.
- **PA action**: dropdown, No action / Set volume. Set volume shows a slider, **0–100%, 0 = silent**,
  in steps of 5, with no number input (Ignat). This departs from 264's −100…+100 relative scale (G4).
  Each station has a default volume (Station details › Base audio settings, 50% in the sample) that
  every audio device at the station uses outside schedules. The Barix equalizer stays on the device.
- **Display action**: dropdown, No action / Darken all displays (the displays are turned off). A
  third, disabled entry is "More actions — to confirm with Tuan".
- **Holidays**: the dates in N8's central, system-wide holiday list (DATNETISR-264).
- **Device rules**: each device gets only what its type supports. ELA and Barix never get display
  power. Barix base audio settings (default volume, equalizer) are a separate, persistent card on
  the device, and are never part of a schedule.
- **States**: empty, loading, load error, field validation with an error summary, saving with
  per-device progress, success, partial failure (each device named with its reason, plus *Retry
  failed*), save error (changes kept). A guard catches unsaved changes on every navigation and on
  closing the tab.

## 3 · Feasible first step (per device, on the current PaxLife API)
One design — no separate phase-1 screen (Ignat, 2026-10-06). The screens stay the same; ETC keeps
the named schedules, resolves each one to the devices at its stations and groups, converts it into
each device's weekly entries and **replaces** that device's schedule through the PaxLife API.
Not possible in the first step (see §4): **Holidays** (G2 — the API is weekly
only). This is not completion
of DATNETISR-264.

Rule for later changes (G6): when a group gains or loses a station, or a device is added or
moved, ETC updates the devices automatically; if that fails, the schedule shows *Out of date* and
opens with an alert listing what changed — Save updates the devices.

## 4 · API and requirement gaps to refine (not shown in the prototype — it shows the result only)
| # | Gap | Who |
|---|---|---|
| G1 | No named or central schedules in the API: ETC must own them | ETC |
| G2 | Holidays: N8 owns the system-wide list; the API is weekly only, so ETC must write dated changes around each holiday | ETC |
| G3 | Ranges → weekday/time on/off entries; overnight splits the off entry onto the next day | ETC |
| G4 | Volume scale: 264 says −100…+100% relative to the station default; the prototype uses an absolute 0–100% (Ignat). Confirm with ETC | ETC · ISR |
| G5 | Overlapping schedules on one device: which one wins? | Product |
| G6 | Re-apply policy when group membership or device assignments change | ETC |
| G7 | Display actions beyond Darken | Tuan |
| G8 | Does ELA accept schedules, and with which fields? | PaxLife |
| G9 | Is the per-device replace atomic? What does a failed device keep? | PaxLife |
| G10 | Active/Inactive vs the API's per-device `enabled` flag when a device has several schedules | ETC |
| G11 | The API's scheduled equalizer is out of scope; the equalizer stays a base setting | Product |

Samples: station groups, schedules, ELA/Barix devices and volumes are sample data. The chrome,
Stations rows, Device list columns and Device details cards are captured from N8.

## 5 · Checked against the PaxLife Device Configuration API (2026-10-06)
Kept privately (`~/.openclaw/reference/etc/`). Ignat's calls on the findings:
- **Fits:** weekday + HH:MM entries (a range = an "on" and an "off" entry, overnight off-entry on
  the next day); absolute volume 0–100 (the slider maps 1:1); **0 = muted**; Darken = `screen_on`
  false/true on `led-isr` / `html-isr`; the station default volume is written to each Barix device
  (`PUT audio/config`); the device page reads `GET /schedule`.
- **No ELA** in this project (ELA is BVG Berlin only). Only `led-isr`, `html-isr`, `audio-barix`.
- **Failures follow the API.** A schedule `PUT` is stored by PaxLife and applied when the device is
  reachable, so an offline device doesn't fail it. Shown: 404 (device unknown) and a transient
  "no response" that Retry fixes. Only the station default volume can hit 502/504 (device offline).
- **No immediate switch on Save** — schedules are set up in advance for long periods.
- **For ETC:** send `timezone: "Asia/Jerusalem"` (the API defaults to Europe/Berlin). A device has
  **one** schedule list in PaxLife; ETC merges every active N8 schedule that reaches the device into
  it on each save, and an inactive N8 schedule simply contributes no entries (the API's `enabled`
  flag is per device, so it isn't used for this).
- **Conflicts:** PaxLife rejects two entries for one device at the same weekday + time. ETC merges
  entries that set different settings (e.g. volume + mute) into one. Two schedules that set the
  *same* setting to *different* values at the same minute on the same device are a real conflict —
  the editor shows it and blocks Save.
- **Open:** equalizer (bass / mid / treble, −12…+12 dB per the API) — where it lives in N8, and
  whether a schedule may change it. Ignat has PaxLife sketches with separate controls.
