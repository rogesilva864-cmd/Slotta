/**
 * Foto de perfil da empresa (campo Company.logo).
 *
 * Fica salva no próprio banco como data URL. O painel já recorta e reduz a
 * imagem no navegador (quadrada, 400 px, JPEG), então cada foto ocupa poucas
 * dezenas de KB. O limite abaixo só barra envios fora do padrão.
 */
export const COMPANY_LOGO_MAX_LENGTH = 400_000;

const DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export function isValidCompanyLogo(value: unknown): value is string {
  return typeof value === 'string' && value.length <= COMPANY_LOGO_MAX_LENGTH && DATA_URL.test(value);
}
