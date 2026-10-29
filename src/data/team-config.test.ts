import { describe, expect, it } from 'vitest';
import { decodeInvite, encodeInvite, normalizeUrl } from './team-config';

describe('convites', () => {
  it('codifica e decodifica a conexão da equipe, inclusive acentos', () => {
    const team = { name: 'Equipe Suflê ção', url: 'https://abc.supabase.co', key: 'sb_publishable_123' };
    expect(decodeInvite(encodeInvite(team))).toEqual(team);
  });

  it('rejeita código inválido', () => {
    expect(decodeInvite('lixo!!')).toBeUndefined();
    expect(decodeInvite(btoa('{"n":1}'))).toBeUndefined();
  });

  it('normaliza o endereço do projeto', () => {
    expect(normalizeUrl(' abc.supabase.co/ ')).toBe('https://abc.supabase.co');
    expect(normalizeUrl('https://abc.supabase.co')).toBe('https://abc.supabase.co');
  });
});
