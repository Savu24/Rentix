/**
 * Stan formularzy zaproszenia.
 *
 * Osobny plik, bo moduł z dyrektywą „use server" może eksportować wyłącznie
 * funkcje asynchroniczne — stała i typ trzymane obok akcji wywracałyby
 * budowanie. Czyta go i akcja na serwerze, i formularz w przeglądarce.
 */
export type InvitationFormState = {
  /** Komunikat na poziomie całego formularza. */
  error: string | null;
  /** Błędy per pole, w kształcie znanym z `fieldErrors` w API. */
  fields: Record<string, string[]>;
};

export const EMPTY_INVITATION_STATE: InvitationFormState = { error: null, fields: {} };
