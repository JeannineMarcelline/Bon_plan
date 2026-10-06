const DECALAGE_MADAGASCAR_MS = 3 * 60 * 60 * 1000;


const parserEnUTC = (dateString) => {
  if (typeof dateString !== 'string') return new Date(dateString);
  const iso = dateString.replace(' ', 'T');
  const aHeure = iso.includes('T');
  const aFuseau = /(Z|[+-]\d{2}(:?\d{2})?)$/i.test(iso);
  
  return new Date(aHeure && !aFuseau ? iso + 'Z' : iso);
};

const decalerVersMadagascar = (dateString) => {
  const date = parserEnUTC(dateString);   // <-- remplace new Date(dateString)
  return new Date(date.getTime() + DECALAGE_MADAGASCAR_MS);
};

export const formatDateHeure = (dateString) => {
 if(!dateString) return 'Date inconnue';

 const d = decalerVersMadagascar(dateString)
 return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
 });
};

export const formatDateSimple = (dateString) => {
 if (!dateString) return null;
  const d = decalerVersMadagascar(dateString);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

export const formatDateCourt = (dateString) => {
  if (!dateString) return 'Date inconnue';
  const d = decalerVersMadagascar(dateString);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

export const formatHeure = (dateString) => {
  if (!dateString) return null;
  const d = decalerVersMadagascar(dateString);
  return d.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
};