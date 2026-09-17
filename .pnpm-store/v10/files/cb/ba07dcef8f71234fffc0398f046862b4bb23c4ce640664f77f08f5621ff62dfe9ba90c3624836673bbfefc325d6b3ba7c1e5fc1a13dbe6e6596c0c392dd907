/**
 * The market's own settings namespace: the half that makes `allowRestart`
 * a switch on the plugin configuration page instead of a line the user has
 * to hand-write into cordis.yml.
 *
 * `allowRestart: false` is the documented answer for a host owned by
 * systemd, launchd or pm2 — a supervisor restarts it, so the market's
 * one-click restart must not launch a second one. Until now the only way to
 * say that was editing YAML in the right place with the right indentation,
 * where a stray space stops the profile booting.
 *
 * Only `allowRestart` is exposed. `profile` names which profile this
 * instance manages: it is decided at mount from the composition or the
 * command line, and a running instance cannot switch to another one, so
 * offering it as a field would promise something the write cannot deliver.
 *
 * The release channel is NOT here either, and that is a correction rather
 * than an omission. It was, briefly, and it made this namespace a second
 * writer for a value the market already stores in its own state.json: the
 * mount read the user's saved channel off disk, then `onChange` assigned
 * `source().channel` — which knows nothing about that file — straight back
 * over it. The choice survived exactly until the next settings event.
 *
 * Only a real host could show that; the unit lane mounts the routes without
 * this layer at all. `allowRestart` needs this door because its only other
 * one is hand-edited YAML. The channel has a control of its own on the
 * plugin configuration page, so a second door bought nothing and cost the
 * setting its memory.
 *
 * The wiring rides the scoped fiber, so a host with no settings service —
 * every dsh before 0.1.0-rc.7 — simply never runs any of this and the entry
 * configuration stands as composed. That is why this needs no version check
 * of its own.
 *
 * It depends on the SERVICE and nothing else, which is the whole point of
 * the shape below. This module used to import two convenience helpers,
 * `installSettingsSection` and `settingsNamespace`, from
 * `@deepseek-ai/dsh-settings`. dsh 0.1.2-alpha.1 deleted both — and a
 * missing NAMED EXPORT is not a missing service. `ctx.inject` degrades
 * quietly; an ESM named import that resolves to nothing is a SyntaxError at
 * module evaluation, which cordis's loader reports as a failed entry and the
 * host exits 1. Installing the market stopped the host from booting at all:
 *
 *   SyntaxError: The requested module '@deepseek-ai/dsh-settings' does not
 *   provide an export named 'installSettingsSection'
 *
 * The service itself never changed — `sctx.settings.register(ns, schema,
 * { base })` is identical in 0.1.0-rc.7 and 0.1.2-alpha.2. Only the two
 * wrappers went away. So this inlines what the wrapper did (verified against
 * its source: an inject, a register, a watch, and an unload effect) and
 * validates the namespace here. Nothing about the graceful-degradation story
 * changes; it just stops being conditional on an export that upstream is
 * free to move.
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
/** Namespace the card on the browser side keys itself to. */
export declare const MARKET_SETTINGS_NS = "dsh-market";
/** The market settings a user may edit at runtime. */
export interface MarketSettings {
    allowRestart: boolean;
}
export declare const MarketSettings: z<MarketSettings>;
/**
 * Wire the namespace so a saved change reaches the routes immediately.
 *
 * The routes read `allowRestart` off this object on every request (the
 * status route reports the capability, the restart route enforces it), so
 * updating it in place is what makes a toggle take effect without a
 * restart — which would be a poor thing to require of a setting whose whole
 * subject is restarting.
 *
 * @param ctx - the plugin context owning the wiring.
 * @param resolved - the live config object the routes read.
 */
export declare function installMarketSettings(ctx: Context, resolved: {
    allowRestart?: boolean;
}): void;
