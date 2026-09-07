/**
 * Catalogue des photos — GENERE, NE PAS MODIFIER A LA MAIN.
 *
 * Produit par `python tools/publier_photos_front.py` a partir de
 * `Assets/_optimized/manifest.json` et du catalogue semantique
 * `tools/photo_catalogue.json`.
 *
 * Chaque entree porte son `blurDataURL` : toute image passe par `next/image`
 * avec `placeholder="blur"`, ce qui evite le saut de mise en page au chargement
 * et fait tenir la demo sans connexion.
 */

export interface VariantePhoto {
  src: string;
  largeur: number;
  hauteur: number;
}

export interface Photo {
  cle: string;
  titre: string;
  alt: string;
  theme: string;
  filieres: string[];
  vedette: boolean;
  blurDataURL: string;
  carte?: VariantePhoto;
  hero?: VariantePhoto;
  vignette?: VariantePhoto;
}

export const PHOTOS: Record<string, Photo> = {
  'action-sociale-distribution-repas': {
    cle: 'action-sociale-distribution-repas',
    titre: 'Distribution de repas',
    alt: 'Femme servant un plat à des enfants rassemblés autour d\'elle dans une ruelle.',
    theme: 'action-sociale',
    filieres: ['restauration'],
    vedette: false,
    blurDataURL: 'data:image/webp;base64,UklGRpwAAABXRUJQVlA4IJAAAAAQBACdASoUABAAPu1iqU2ppaOiMAgBMB2JQBfNBshJy2J6jExgcOudgADOB2tdJOzwrixLg8M0++IFKrR+FtwD6Z9sbAUvV4A5ObZivcsSoFDYlji4Dy0Zny3auIc2WmpwcGF+Vx4jaC3nUjfkSuzjs1F8HVtvY/GRLEtwYnfj7IfehFWlQTv+vi5p66NAAAA=',
    hero: { src: '/img/photos/heros/action-sociale-distribution-repas.webp', largeur: 1600, hauteur: 899 },
    carte: { src: '/img/photos/cards/action-sociale-distribution-repas.webp', largeur: 900, hauteur: 674 },
  },
  'artisanat-bijoux-cliente': {
    cle: 'artisanat-bijoux-cliente',
    titre: 'Cliente devant un étal de bijoux artisanaux',
    alt: 'Cliente examinant des boucles d\'oreilles perlées devant un étal de colliers et de sacs artisanaux.',
    theme: 'commerce',
    filieres: ['artisanat', 'bijouterie'],
    vedette: false,
    blurDataURL: 'data:image/webp;base64,UklGRiABAABXRUJQVlA4IBQBAACQBgCdASoUAB4APu1iqU2ppaOiMAgBMB2JQBOmZi3/2aBlgw17RAy7rap7gDUCDLS109pPdzBrKvJpGGEgAOIW9NuiGXnlYK0xhBg/ASdqsCA99/37b0aE4mLZSg1fIWDMNm+q4glEEL6OqpAflCZEvxn/0+QacpTJ/Lq2DBycYFbi0blddG9m3jAbmoL32amRDLRCnXpAVdKn+f/3e6Zo3PapJ9qSRBkKc6B6SxWqMXwEMrZ0SQNyevzuQOZ0UQSZRIROIcmo3R2ij8PkAV/8Mws7g/XJj/ltaaLDXMo7ITGgOglLTtbuy33OxzrEIw7CEa2OxcH9ODLKwRBrkheIxQHMgNXoDgMEB5iQsg8Zmw+52AA=',
    hero: { src: '/img/photos/heros/artisanat-bijoux-cliente.webp', largeur: 1600, hauteur: 900 },
    carte: { src: '/img/photos/cards/artisanat-bijoux-cliente.webp', largeur: 900, hauteur: 675 },
  },
  'artisanat-gestion-carnet': {
    cle: 'artisanat-gestion-carnet',
    titre: 'Tenue de registre dans une boutique d\'artisanat',
    alt: 'Artisane assise devant sa boutique de vannerie et de sculptures, notant ses ventes sur un carnet.',
    theme: 'gestion',
    filieres: ['artisanat'],
    vedette: false,
    blurDataURL: 'data:image/webp;base64,UklGRuwAAABXRUJQVlA4IOAAAABQBgCdASoUABwAPu1sqlGppaOiqAqpMB2JQBOmUDX/yMAlQApn+v3430F2s23Tfe79oMrB83RkieJL2AD+TN2VWSrQONQqEaBntYipKjmlQsr5ZlyZcoKGpYa9lX6I3ILV1mZSg0kLDTL1P6ZfhYahZj0wY4WM/MdjzakIwt4YrBsaCUOFMI5uwV7idxN3C01Lh+0A3kBn6ODYKiC7e95SicNiWttkLqT5j4iAA1QrACuDnS/05p4/Am7eI/5NTJnnVJTBc7lwMfHp446flDZYN3fwt+wyk7JU0HdQUy8AAA==',
    hero: { src: '/img/photos/heros/artisanat-gestion-carnet.webp', largeur: 1600, hauteur: 899 },
    carte: { src: '/img/photos/cards/artisanat-gestion-carnet.webp', largeur: 900, hauteur: 675 },
  },
  'artisanat-vannerie-calebasses': {
    cle: 'artisanat-vannerie-calebasses',
    titre: 'Étal de vannerie et de calebasses',
    alt: 'Étal d\'artisanat garni de paniers tressés, de calebasses et de poteries.',
    theme: 'production',
    filieres: ['artisanat', 'vannerie', 'poterie'],
    vedette: true,
    blurDataURL: 'data:image/webp;base64,UklGRooAAABXRUJQVlA4IH4AAABQBACdASoUAAsAPu1iqU2ppaOiMAgBMB2JYwCdMoADZ0+mo7Fj9uQodJWAAPnvovuLTOXtzp432I6qWUJL5zXI2lHfxi/Ji0+FcSD3Ppv56eRuW/0mmYp35MAkVFIOzpJNra+HJBmpAKhgn4wOxhSm9BHtpF0GNyxKEKergAA=',
    hero: { src: '/img/photos/heros/artisanat-vannerie-calebasses.webp', largeur: 1600, hauteur: 900 },
    carte: { src: '/img/photos/cards/artisanat-vannerie-calebasses.webp', largeur: 900, hauteur: 675 },
  },
  'ceremonie-journee-femme-echarpes': {
    cle: 'ceremonie-journee-femme-echarpes',
    titre: 'Cérémonie officielle',
    alt: 'Cérémonie officielle : participantes portant des écharpes de distinction.',
    theme: 'ceremonie',
    filieres: [],
    vedette: false,
    blurDataURL: 'data:image/webp;base64,UklGRqYAAABXRUJQVlA4IJoAAAAwBACdASoUAA0APu1iqU2ppaOiMAgBMB2JbACw7CP89d/fZeaJArMby5AA/s3z8ZgpHncmmelwjakZUsZdHu99IvccO3aSP6WzPB5+HEVh9rQwLEy4RYauk6gpNeDfvIcQQ5ldvbgAWFVfae3U/KXQ0/70+ZpeM1+d08gG/TARxEzOBGS7H+tyotzZ4s19CauQ805HPsLqAAAA',
    hero: { src: '/img/photos/heros/ceremonie-journee-femme-echarpes.webp', largeur: 1600, hauteur: 900 },
    carte: { src: '/img/photos/cards/ceremonie-journee-femme-echarpes.webp', largeur: 900, hauteur: 675 },
  },
  'certification-remise-diplomes-toges': {
    cle: 'certification-remise-diplomes-toges',
    titre: 'Remise de diplômes',
    alt: 'Femmes en toge et toque lors d\'une cérémonie de remise de diplômes.',
    theme: 'certification',
    filieres: [],
    vedette: true,
    blurDataURL: 'data:image/webp;base64,UklGRpwAAABXRUJQVlA4IJAAAAAQBACdASoUAA0APu1iqU2ppaOiMAgBMB2JQBOgMYsap3SeVdOq4/IAeAD9qMejp47BlXDfcUkmg+v5H5joqqxJmwZC9vFGjTSPknL8DCMQskON23VtnWefKw8NwNjc7rfgB/X2+HHP6GVfgZkvAdqJy1scfJjNAbCMXLOW/jy5mXdFd5NthCUU7KxlZG6AAAA=',
    hero: { src: '/img/photos/heros/certification-remise-diplomes-toges.webp', largeur: 1600, hauteur: 899 },
    carte: { src: '/img/photos/cards/certification-remise-diplomes-toges.webp', largeur: 900, hauteur: 675 },
    vignette: { src: '/img/photos/thumbs/certification-remise-diplomes-toges.webp', largeur: 320, hauteur: 320 },
  },
  'communaute-rassemblement-jeunes-femmes': {
    cle: 'communaute-rassemblement-jeunes-femmes',
    titre: 'Rassemblement communautaire',
    alt: 'Trois jeunes femmes en tenues colorées discutant lors d\'un rassemblement communautaire.',
    theme: 'vie-communautaire',
    filieres: [],
    vedette: false,
    blurDataURL: 'data:image/webp;base64,UklGRq4AAABXRUJQVlA4IKIAAACQBACdASoUAAwAPu1iqU2ppaOiMAgBMB2JbACdMoFWAARLIQW/PZNRV0Q2pgAA/qvlnPvWcVeDiYI+5bCF/NhCOXq4DDy5RM8EbiL1VBL4OLKrJRbfD6zAwVe04pREVys3cnsY5Hzmiio/mskc8B3ZEDoO2IIgRLmiYJHEgMqDRf1JH7YrmtlxMg2pdVRlT50e+fI1QvNH5NQjxiafT7R7oAA=',
    hero: { src: '/img/photos/heros/communaute-rassemblement-jeunes-femmes.webp', largeur: 1600, hauteur: 899 },
    carte: { src: '/img/photos/cards/communaute-rassemblement-jeunes-femmes.webp', largeur: 900, hauteur: 675 },
  },
  'coordination-reunion-bureau': {
    cle: 'coordination-reunion-bureau',
    titre: 'Réunion de coordination',
    alt: 'Réunion de travail : femmes attablées autour d\'une tablette et d\'un ordinateur portable.',
    theme: 'gouvernance',
    filieres: [],
    vedette: true,
    blurDataURL: 'data:image/webp;base64,UklGRqAAAABXRUJQVlA4IJQAAAAQBACdASoUAA0APu1iqU2ppaOiMAgBMB2JYgCw7YwS5X7z/IkDaEm0gAD92UN7wi4w++vtlqXGulLHWCYo/3MB7NxBVW+Y4nbgEQtieWb8dShj9oIqID5JDAy1qTx7UAKlMRTO2/vjOzgWogidV+E5Rv+J6fyiJc4KHOJhcLhm5P061ON0uicem3waHJMYAkXwRAAA',
    hero: { src: '/img/photos/heros/coordination-reunion-bureau.webp', largeur: 1600, hauteur: 900 },
    carte: { src: '/img/photos/cards/coordination-reunion-bureau.webp', largeur: 900, hauteur: 675 },
  },
  'foire-stand-cosmetiques-vendeuse': {
    cle: 'foire-stand-cosmetiques-vendeuse',
    titre: 'Stand de cosmétiques artisanaux en foire',
    alt: 'Exposante présentant un pot de cosmétique artisanal sur son stand, gamme de produits étiquetés alignée devant elle.',
    theme: 'valorisation',
    filieres: ['cosmetiques', 'saponification'],
    vedette: true,
    blurDataURL: 'data:image/webp;base64,UklGRh4BAABXRUJQVlA4IBIBAABQBgCdASoUABwAPu1mqk2ppaQiMAgBMB2JbACdMuu0mJ2twFc0JpSVACYt1JY9Ye2QRDtj+E7jewDuQAD9v2iJiQdrE5oLlGRr/Em4Syw5lUahXunEGiT0L/8xM7si/t6gwvEhCzGKMHboFKvbM3JyLfGIi6BjVBXGeMbsgLOYC4KcF0CC6ig/SlnbUGG9BImci7E3fEaNoDtNlumro4l0QfFZw+QmFdJ4Yf8/0kNOUMlv0v8nrLMgFuH6R/ErTMXp517Quesrktvi69PKrf4slQnqmNlMbUunlsw+QiigOcBpB4y/z+kbNLa881+y7+unob2vCEK7K4nVnkxkNHfb7pw+3ZayOf1ZWq1/iN8/8QAA',
    hero: { src: '/img/photos/heros/foire-stand-cosmetiques-vendeuse.webp', largeur: 1600, hauteur: 900 },
    carte: { src: '/img/photos/cards/foire-stand-cosmetiques-vendeuse.webp', largeur: 900, hauteur: 675 },
    vignette: { src: '/img/photos/thumbs/foire-stand-cosmetiques-vendeuse.webp', largeur: 320, hauteur: 320 },
  },
  'foire-visiteuses-stands': {
    cle: 'foire-visiteuses-stands',
    titre: 'Visiteuses d\'une foire de produits locaux',
    alt: 'Visiteuses circulant entre les stands d\'une foire de produits locaux.',
    theme: 'valorisation',
    filieres: [],
    vedette: false,
    blurDataURL: 'data:image/webp;base64,UklGRhQBAABXRUJQVlA4IAgBAADwBQCdASoUABwAPu1qsFAppaUiqAqpMB2JagCdMoBOAbTEhUVr3f34V9VOiXONAbFIlSBQSwZ/AAD+lMcFOnWyDnDE1L+9nWmNXziBxPEUqlm2cIs6vmL9EoGleaDDwuSm0US46qdkL2cc6trvsATbYG5XAfOyqelO8X1x4Kb6d/1GJvAMUL3aNmQQIh8gjFDVcSPHJDZJxrTspGMIayuaQ+VQ/dRtmF8UGJTYXtORxrWmmhyBuWQVqKVM95cbK/M0tRWMDI0vfXJaK3kwlxqIBhk/9sgdkEPJSfxWuEgfMBHIYIoddF4dpk4v93Ui+qar/WmPIalC4r9VAU2zFyrUCFA5xQLLCAA=',
    hero: { src: '/img/photos/heros/foire-visiteuses-stands.webp', largeur: 1600, hauteur: 900 },
    carte: { src: '/img/photos/cards/foire-visiteuses-stands.webp', largeur: 900, hauteur: 675 },
  },
  'formation-amphitheatre-participantes': {
    cle: 'formation-amphitheatre-participantes',
    titre: 'Session de formation en amphithéâtre',
    alt: 'Amphithéâtre rempli de participantes à une session de formation collective.',
    theme: 'formation',
    filieres: [],
    vedette: true,
    blurDataURL: 'data:image/webp;base64,UklGRpwAAABXRUJQVlA4IJAAAADQAwCdASoUAA0APu1iqU2ppaOiMAgBMB2JYwAAXFWP7e0k6pDG1FAA/ApnyuXRw70AFkMY3Ip2vHGC+l7zTEbvwc7iJg93MR+1n6tyQzQz0/mQ6T5YHeWo5eX6LnlEtWLeZ7o9+eS5L91g5TEdFLI5Q8k2i1Xcf+uAZaNahujiKUMcFANudfVGTABnnjYAAAA=',
    hero: { src: '/img/photos/heros/formation-amphitheatre-participantes.webp', largeur: 1600, hauteur: 900 },
    carte: { src: '/img/photos/cards/formation-amphitheatre-participantes.webp', largeur: 900, hauteur: 675 },
  },
  'formation-participante-notes': {
    cle: 'formation-participante-notes',
    titre: 'Prise de notes en formation',
    alt: 'Participante prenant des notes sur un banc de salle de formation.',
    theme: 'formation',
    filieres: [],
    vedette: false,
    blurDataURL: 'data:image/webp;base64,UklGRtYAAABXRUJQVlA4IMoAAACQBQCdASoUAB4APu1or1AppaSiqAqpMB2JbACdMuunJHLiP03u7Lo9IEIhWc78UuooSluOEAD3pGQVb5wyHvu5MmAXbHox4zoY4sr6hzTb3Auvk6xxrIML34b4upDUMNRVoE6Cs9+BddT2uydwohDhmsnSffbii9VU1E81Rbe28HDXHsKI36BCqkjzBOWnwDoqnXXsj71os/ITN/48AejOYdt3Gnb4HnKuB7uof6KLA3AHPILLV1cxzsWfAdDgmhEs46pIK/YiuAAA',
    carte: { src: '/img/photos/cards/formation-participante-notes.webp', largeur: 900, hauteur: 675 },
    vignette: { src: '/img/photos/thumbs/formation-participante-notes.webp', largeur: 320, hauteur: 320 },
  },
  'groupement-femmes-reunion-jardin': {
    cle: 'groupement-femmes-reunion-jardin',
    titre: 'Réunion de groupement en extérieur',
    alt: 'Quatre femmes en tenues traditionnelles réunies autour d\'une table dans une cour verdoyante.',
    theme: 'vie-associative',
    filieres: [],
    vedette: false,
    blurDataURL: 'data:image/webp;base64,UklGRqAAAABXRUJQVlA4IJQAAABQBACdASoUAA0APu1iqU2ppaOiMAgBMB2JbACdAYw64GUfz99dxs26eJmAAP0rDBd1VRcAB8c3Z8R6oGJ9mCIJMd0gQPEHEAK5pRLQOXpTyoaWh5vrO3kRPA2clJ0x+XdQ2mQfxmTvsj/f5BITUY1knTyXz/HwCNXC5WFGHvyPTXXi97QiBh4EHvAWiYbyqxEmgAAA',
    carte: { src: '/img/photos/cards/groupement-femmes-reunion-jardin.webp', largeur: 900, hauteur: 675 },
    vignette: { src: '/img/photos/thumbs/groupement-femmes-reunion-jardin.webp', largeur: 320, hauteur: 320 },
  },
  'logistique-livraison-scooter': {
    cle: 'logistique-livraison-scooter',
    titre: 'Livraison en deux-roues',
    alt: 'Livreur assis sur son scooter, colis empilés, téléphone à l\'oreille.',
    theme: 'logistique',
    filieres: ['logistique'],
    vedette: false,
    blurDataURL: 'data:image/webp;base64,UklGRqwAAABXRUJQVlA4IKAAAAAQBACdASoUAA0APu1iqU2ppaOiMAgBMB2JagC2yYxY226DOPOJia3OcAD+8RiWDMrexF4WiTDsS3gZm5LCqytZM8SsKCu6d7pEd2UD1eIVaxiUrHhBHbfiZy7K1VbCtx+kvyaGKsNpa64pe933oNWvSe9L4dCqsfJYdtFm1jk4RB+wixRudS/IGefI9TDtnd9XPQZqN8YR0ok8D6SOoAAA',
    carte: { src: '/img/photos/cards/logistique-livraison-scooter.webp', largeur: 900, hauteur: 675 },
    vignette: { src: '/img/photos/thumbs/logistique-livraison-scooter.webp', largeur: 320, hauteur: 320 },
  },
  'marche-cereales-vendeuses': {
    cle: 'marche-cereales-vendeuses',
    titre: 'Vendeuses de céréales',
    alt: 'Deux vendeuses de céréales versant de la farine dans une grande bassine, au marché.',
    theme: 'commerce',
    filieres: ['cereales', 'commerce-vivrier'],
    vedette: true,
    blurDataURL: 'data:image/webp;base64,UklGRqwAAABXRUJQVlA4IKAAAACQBACdASoUAA4APu1iqU2ppaOiMAgBMB2JZgCdMoAlvw/f4bpZp7elAkQosSAA/kJ5gCmZeVxzXZ7kRERhiQlR12OGDiS4dk3TJ6d5iyw1T2U9W76LYX3NBkIBu5dzphKTD/PXmACf5rNNMqORFLT/Im2wAddmY+V5TU0+RdxRPGmm0+FP4FZt2bRsf74SIilBVZTjFcRdrX0ldDkAb1QA',
    hero: { src: '/img/photos/heros/marche-cereales-vendeuses.webp', largeur: 1600, hauteur: 900 },
    carte: { src: '/img/photos/cards/marche-cereales-vendeuses.webp', largeur: 900, hauteur: 675 },
    vignette: { src: '/img/photos/thumbs/marche-cereales-vendeuses.webp', largeur: 320, hauteur: 320 },
  },
  'marche-etals-vivrier': {
    cle: 'marche-etals-vivrier',
    titre: 'Marché de rue, étals de vivrier',
    alt: 'Marché de rue animé : bassines de farine, d\'arachides et de céréales devant des étals couverts.',
    theme: 'commerce',
    filieres: ['cereales', 'commerce-vivrier'],
    vedette: false,
    blurDataURL: 'data:image/webp;base64,UklGRsAAAABXRUJQVlA4ILQAAADQBACdASoUABQAPu1wsFIppiSiqAgBMB2JQBOmYTy4AW/UexaEwyXnGhmStehmgAD+nzGqt1hS7PuKcuQaFwLRCnu1usZ19yMG4hlsBhXWUWjcM91E20Oy7lkKfY0LVqIbediHmJX8z1BVR5qcjveMG1O2/+EQ/6YNgZ0y2ldyqipIzrQtqt3344MxEWhvZZ80ZYjYZ58fJPui3v0h73jSvmeTY92ptMB836D+lhmwbHd/AAA=',
    hero: { src: '/img/photos/heros/marche-etals-vivrier.webp', largeur: 1600, hauteur: 899 },
    carte: { src: '/img/photos/cards/marche-etals-vivrier.webp', largeur: 900, hauteur: 674 },
  },
  'marche-feuilles-sechees-plein-air': {
    cle: 'marche-feuilles-sechees-plein-air',
    titre: 'Étal de feuilles séchées',
    alt: 'Étal de feuilles séchées au cœur d\'un marché de plein air très fréquenté.',
    theme: 'commerce',
    filieres: ['commerce-vivrier', 'transformation-agroalimentaire'],
    vedette: false,
    blurDataURL: 'data:image/webp;base64,UklGRpwAAABXRUJQVlA4IJAAAAAQBACdASoUAA0APu1iqU2ppaOiMAgBMB2JQBOmUDX/wH1bbKxvHArdgAD9uJ4ObC9h6kbLWvf3f0PZOEgy7tcVH/ObQq+elM8sRfgoqVrJ0UKP1EkbHmdHlke9JPDhxJ30zBLwyvaWh36Eg02gBasT0ZnzbEEcLtNNlByPkGAtyoQ3AUSDvNq5HdWmEJBysAA=',
    hero: { src: '/img/photos/heros/marche-feuilles-sechees-plein-air.webp', largeur: 1600, hauteur: 900 },
    carte: { src: '/img/photos/cards/marche-feuilles-sechees-plein-air.webp', largeur: 900, hauteur: 675 },
  },
  'marche-vivrier-cereales-legumes': {
    cle: 'marche-vivrier-cereales-legumes',
    titre: 'Étal de vivrier et de céréales',
    alt: 'Étal de marché garni d\'oignons, de tomates séchées, de céréales et de sachets de farine.',
    theme: 'commerce',
    filieres: ['cereales', 'commerce-vivrier', 'maraichage'],
    vedette: false,
    blurDataURL: 'data:image/webp;base64,UklGRpYAAABXRUJQVlA4IIoAAAAQBACdASoUAA0APu1iqU2ppaOiMAgBMB2JZACdAdwLhUMaKLXpxDBi4ADLGxR/h3MqHe5ntIpePQuEX52olWIqwavk22wUwxzB+4QmZ7Oa7oTpVPLX5cyP7rJJc33FnlTalM510KYqZS/Ty7sg+Y4JhL7XNKHXPbxSZurcvDe5OZv7qtOWuGw4AAA=',
    hero: { src: '/img/photos/heros/marche-vivrier-cereales-legumes.webp', largeur: 1600, hauteur: 900 },
    carte: { src: '/img/photos/cards/marche-vivrier-cereales-legumes.webp', largeur: 900, hauteur: 675 },
  },
  'portrait-groupe-bureau-groupement': {
    cle: 'portrait-groupe-bureau-groupement',
    titre: 'Portrait de groupe — bureau d\'un groupement',
    alt: 'Portrait de groupe de cinq femmes en tenues d\'apparat, posant côte à côte.',
    theme: 'portrait',
    filieres: [],
    vedette: true,
    blurDataURL: 'data:image/webp;base64,UklGRnwAAABXRUJQVlA4IHAAAAAQBACdASoUAAwAPu1iqk2ppaQiMAgBMB2JYgCdMoAB7G9sL7tJLdx/oADZLFRor2L5q/SsuhCKcuLuchGs9ylVoBwpGaDUQDpLuAlrHUhKonKkLLX3IDdxKppphRQeHplcbb93F0mRjw5ZF/zngAAA',
    hero: { src: '/img/photos/heros/portrait-groupe-bureau-groupement.webp', largeur: 1600, hauteur: 899 },
    carte: { src: '/img/photos/cards/portrait-groupe-bureau-groupement.webp', largeur: 900, hauteur: 675 },
  },
  'portrait-jeune-femme-evenement': {
    cle: 'portrait-jeune-femme-evenement',
    titre: 'Portrait — jeune membre',
    alt: 'Portrait d\'une jeune femme souriante lors d\'un événement communautaire.',
    theme: 'portrait',
    filieres: [],
    vedette: false,
    blurDataURL: 'data:image/webp;base64,UklGRtQAAABXRUJQVlA4IMgAAACQBQCdASoUABwAPu1wsVKppiSiqAgBMB2JYgCdMtPv6CUPxgwWZl2cnfVUH4F8jrCsj7K8+AD+7q6/v+botFQR9+LDDVwBs3EQBKSwZbbw48LOuBYyWObdihz3XWBx6aBhttNFIhwe/SETZGxVD1xRUtkLy2F3HvW4Er7l12zMIBU0wYqvsAwg8aXl+yDUGqG7Tp/1I7tPWO8joMwikN5ariUeGYmsgvTIgTjldnwKvaocXnkLcEE2x0BdZZyndAMeYAQ2GWiAAA==',
    vignette: { src: '/img/photos/thumbs/portrait-jeune-femme-evenement.webp', largeur: 320, hauteur: 320 },
  },
  'portrait-participante-formation': {
    cle: 'portrait-participante-formation',
    titre: 'Portrait — participante en formation',
    alt: 'Portrait d\'une participante assise dans une salle de formation.',
    theme: 'portrait',
    filieres: [],
    vedette: false,
    blurDataURL: 'data:image/webp;base64,UklGRvwAAABXRUJQVlA4IPAAAABQBgCdASoUAB4APu1orlCppaQiqAqpMB2JZACdMoM1XnbPADGlTopGIincHK7aYSgKXM5OnQ5XG3mhAAD+7JOKyMDZwL6tjkNHFq30X56ixr0cbCwS2QjVHq63vyyIoDkEZ2Zb2MxFE3GafNIgKh1AjqkiDV7Z8+aAbn5mNGW31f4TRISgBAr4kBLE8USThQD2UuOzPFB1YsYKI+txy+JFw3DH7OZy6zR+EKgXOarYkpLHIBFGkts3OtV+hCJAU9jPkOVlk6ZvuLvAbc54hUI5l4kBnSM981Y+90MW7tG85RrMoHv/KN4rNP1SiPgAAAA=',
    vignette: { src: '/img/photos/thumbs/portrait-participante-formation.webp', largeur: 320, hauteur: 320 },
  },
  'portraits-femmes-ceremonie': {
    cle: 'portraits-femmes-ceremonie',
    titre: 'Portraits — membres en tenue de cérémonie',
    alt: 'Trois femmes en tenues traditionnelles et colliers de perles, lors d\'une cérémonie.',
    theme: 'portrait',
    filieres: [],
    vedette: false,
    blurDataURL: 'data:image/webp;base64,UklGRvQAAABXRUJQVlA4IOgAAADwBQCdASoUABwAPu1oq08ppiOiMBgIATAdiWYAnTLVQNgSPshPVDO72dm+FbuuYpiM8UQFmsEAAAD+7WFcILPfAmUKZsMclYtkCgj3aQR9clfQo3LCiDc9+FNcbZp32Jh+W/gepFd+bSTdh/+s++QB2nCP3CDc4xBRm8GRzBA271PBcV5sFqOoib5/E1YaHjXQvGlMIvyLWdb/bWsKkc3Kku7QiNrO020uVGwJ6WBL2aKi9RkPw7mBxZnSbh/JZMUuZV3HEtiARdZCdvp7gxcEJs3anZr6KAQkrjRjwgThOkXMbBWPV8AA',
    carte: { src: '/img/photos/cards/portraits-femmes-ceremonie.webp', largeur: 900, hauteur: 675 },
    vignette: { src: '/img/photos/thumbs/portraits-femmes-ceremonie.webp', largeur: 320, hauteur: 320 },
  },
  'restauration-buffet-evenement': {
    cle: 'restauration-buffet-evenement',
    titre: 'Service de repas lors d\'un événement',
    alt: 'Convives se servant à un buffet lors d\'un événement communautaire.',
    theme: 'production',
    filieres: ['restauration', 'transformation-agroalimentaire'],
    vedette: false,
    blurDataURL: 'data:image/webp;base64,UklGRpoAAABXRUJQVlA4II4AAADwAwCdASoUAA0APu1iqU2ppaOiMAgBMB2JZgCw7CPsZ6bArmXZQqAAAP4ngxZS25D4Oi4KHnTqFArfsvhc2FOqyhaCYfmgwv7Y9bYfUARWfgukcG5bDHVyhP7GdWk4Wrvszijit75Dplhaaed3FWAhW6EAegknzvezSEsoIZewcS6LZ+5zU3wfcCJSRoAA',
    hero: { src: '/img/photos/heros/restauration-buffet-evenement.webp', largeur: 1600, hauteur: 900 },
    carte: { src: '/img/photos/cards/restauration-buffet-evenement.webp', largeur: 900, hauteur: 675 },
  },
  'restauration-vente-plats-rue': {
    cle: 'restauration-vente-plats-rue',
    titre: 'Vente de plats cuisinés',
    alt: 'Restauratrice servant une assiette de plat cuisiné depuis son étal de rue.',
    theme: 'production',
    filieres: ['restauration'],
    vedette: false,
    blurDataURL: 'data:image/webp;base64,UklGRrgAAABXRUJQVlA4IKwAAACQBACdASoUAA8APu1iqU2ppaOiMAgBMB2JbACdMoMYLKAAvRDPfTyc5pCOYQAA/i520fbFl9gOQHt5UX6UBZtIhHCeBTVZgCzNhhSegDxI+lA8+4ucuhlMp7BNDLYVxpBRwaI0ybOK2aTyN4Nmxe9nKVZZeK1qCXFtwPnMBhQaRnUqb5bOulJBJdjkz+ZuSzSDausQJBLvKYFH+muvf+Jt2JluTu6+bskMICAA',
    hero: { src: '/img/photos/heros/restauration-vente-plats-rue.webp', largeur: 1600, hauteur: 899 },
    carte: { src: '/img/photos/cards/restauration-vente-plats-rue.webp', largeur: 900, hauteur: 670 },
    vignette: { src: '/img/photos/thumbs/restauration-vente-plats-rue.webp', largeur: 320, hauteur: 320 },
  },
  'services-coiffure-tressage': {
    cle: 'services-coiffure-tressage',
    titre: 'Prestation de coiffure au marché',
    alt: 'Coiffeuse tressant les cheveux d\'une cliente installée devant son étal de marché.',
    theme: 'production',
    filieres: ['services', 'coiffure'],
    vedette: false,
    blurDataURL: 'data:image/webp;base64,UklGRgoBAABXRUJQVlA4IP4AAADQBQCdASoUABkAPu1ur1IppiQiqAgBMB2JYgCdM1jpA+ga0khb4QkHROzaC23cXafPZp8Lu+EsAPuk7+AsoNWF/pJany38gflyJc6Bg+WPq/SEzot19i5XlcErD0r7Kgcbp7sZYYLxhL2lDy15wHIP4kfuHouMdMHLYQsVyjJQkVNqqWwV93WhahymHmWeF8En6lXOh2vblABgXWTldaN7e/UcYX8RyJw2qqitkweFcA5kR9dQ3LdlmAm/+/yfHCxnDejNsHz0NI5T0waB3VIdjGZvTk5LLpqZS3uP4O6RV3/sN2fmMg2WJgzkHrdDxofffGIo1whBwfG/0+wAAA==',
    hero: { src: '/img/photos/heros/services-coiffure-tressage.webp', largeur: 1600, hauteur: 900 },
    carte: { src: '/img/photos/cards/services-coiffure-tressage.webp', largeur: 900, hauteur: 675 },
  },
  'transformation-decorticage-bassine': {
    cle: 'transformation-decorticage-bassine',
    titre: 'Décorticage en bassine',
    alt: 'Trois femmes penchées sur une bassine, décortiquant des arachides ensemble.',
    theme: 'production',
    filieres: ['transformation-agroalimentaire'],
    vedette: false,
    blurDataURL: 'data:image/webp;base64,UklGRqwAAABXRUJQVlA4IKAAAADwAwCdASoUAA0APu1iqU2ppaOiMAgBMB2JQBOgMX6WfFGd5eGbr9AwAP10qyCm503bXreC+kbrn/zi/sqRMyL1mHDRS3AOYxCcJajCv2fOjyddKnt4sjycf9yUnvB1XaTG8czukGDn+YMMVlCTL0LsuxbIgIcUaYD0xb7SSJaVW9hQLPhqncGeXZSG/acSsKIJ9Qax/CXvNispOihWMAAA',
    carte: { src: '/img/photos/cards/transformation-decorticage-bassine.webp', largeur: 900, hauteur: 675 },
    vignette: { src: '/img/photos/thumbs/transformation-decorticage-bassine.webp', largeur: 320, hauteur: 320 },
  },
  'transformation-pilage-collectif': {
    cle: 'transformation-pilage-collectif',
    titre: 'Pilage collectif',
    alt: 'Femmes d\'un groupement pilant des céréales dans un fût, à tour de rôle, sous un manguier.',
    theme: 'production',
    filieres: ['transformation-agroalimentaire', 'cereales'],
    vedette: false,
    blurDataURL: 'data:image/webp;base64,UklGRqAAAABXRUJQVlA4IJQAAADQAwCdASoUAA0APu1iqU2ppaOiMAgBMB2JbACdAB89y0bJoc/Bv6AAzZOIiwIKBHx6XD+CELUIq0r+i26CaXtU9kCeOGNS4SYTd2wv42/rz3rhHjIIRSad2wHFT+gyCvlJ5t8ptTL4laJQBLkj90SN60FRTr6EaqT8FJQW6bDF6PpudilJL586mQpVWvUu1TWvoAAA',
    hero: { src: '/img/photos/heros/transformation-pilage-collectif.webp', largeur: 1600, hauteur: 900 },
    carte: { src: '/img/photos/cards/transformation-pilage-collectif.webp', largeur: 900, hauteur: 675 },
  },
  'transformation-tri-arachides-collectif': {
    cle: 'transformation-tri-arachides-collectif',
    titre: 'Tri collectif d\'arachides',
    alt: 'Groupe de femmes et d\'hommes assis en cercle sur une bâche, triant des arachides à la main.',
    theme: 'production',
    filieres: ['transformation-agroalimentaire', 'cereales'],
    vedette: false,
    blurDataURL: 'data:image/webp;base64,UklGRqIAAABXRUJQVlA4IJYAAABQBACdASoUAA0APu1iqU2ppaOiMAgBMB2JaACdMoRwAdCsz63R7Xwt2XeAAP7N+wzDGZYux5ijDBMTqShUidSSezgPyM+BeRhpQfh7TiCeslJ7NH6q73c4EE/eMl9ZmmISKgHcAvq3eKUopwDtSIeAARSvfd4u0f8AxNB/tz2t1GRLxWJ8eu/ON8edebxSWgdU1PAqgAA=',
    hero: { src: '/img/photos/heros/transformation-tri-arachides-collectif.webp', largeur: 1600, hauteur: 899 },
    carte: { src: '/img/photos/cards/transformation-tri-arachides-collectif.webp', largeur: 900, hauteur: 675 },
  },
};

/** Cles du catalogue, ordre stable — utile aux tirages deterministes. */
export const CLES_PHOTOS: string[] = Object.keys(PHOTOS);

/** Photos rattachees a une filiere donnee, par slug de filiere. */
export function photosParFiliere(slugFiliere: string): Photo[] {
  return CLES_PHOTOS.map((c) => PHOTOS[c]).filter((p) =>
    p.filieres.some((f) => slugFiliere.includes(f) || f.includes(slugFiliere)),
  );
}

/** Photos d'un theme donne (formation, certification, commerce, portrait...). */
export function photosParTheme(theme: string): Photo[] {
  return CLES_PHOTOS.map((c) => PHOTOS[c]).filter((p) => p.theme === theme);
}
