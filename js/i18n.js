/* ── ENI Bexder — Internationalisation ────────────────────────────────── */

const I18n = (() => {
  const TRANSLATIONS = {
    en: {
      all_games:        'All Games',
      recently_played:  'Recently Played',
      favorites:        'Favorites',
      arcade:           'Arcade',
      select_game:      'Select a Game',
      select_game_desc: 'Browse your library and select a game to see details.',
      no_games_found:   'No Games Found',
      no_games_desc:    'Add ROMs to your library to get started.',
      open_roms:        'Open ROMs Folder',
      last_played:      'Last Played',
      play_time:        'Play Time',
      play_btn:         'Play',
      search_placeholder: 'Search games…',
      settings_title:   'Settings',
      tab_appearance:   'Appearance',
      tab_time:         'Time',
      tab_language:     'Language',
      tab_audio:        'Audio',
      tab_startup:      'Startup',
      tab_autosave:     'Auto Save',
      tab_library:      'Library',
      tab_emulator:     'Emulator',
      tab_controls:     'Controls',
      save_btn:         'Save',
      apply_btn:        'Apply',
      cancel_btn:       'Cancel',
    },
    es: {
      all_games:        'Todos los Juegos',
      recently_played:  'Jugados Recientemente',
      favorites:        'Favoritos',
      arcade:           'Arcade',
      select_game:      'Selecciona un Juego',
      select_game_desc: 'Explora tu biblioteca y selecciona un juego para ver detalles.',
      no_games_found:   'No Se Encontraron Juegos',
      no_games_desc:    'Añade ROMs a tu biblioteca para comenzar.',
      open_roms:        'Abrir Carpeta de ROMs',
      last_played:      'Última Vez Jugado',
      play_time:        'Tiempo de Juego',
      play_btn:         'Jugar',
      search_placeholder: 'Buscar juegos…',
      settings_title:   'Configuración',
      tab_appearance:   'Apariencia',
      tab_time:         'Hora',
      tab_language:     'Idioma',
      tab_audio:        'Audio',
      tab_startup:      'Inicio',
      tab_autosave:     'Guardado Auto',
      tab_library:      'Biblioteca',
      tab_emulator:     'Emulador',
      tab_controls:     'Controles',
      save_btn:         'Guardar',
      apply_btn:        'Aplicar',
      cancel_btn:       'Cancelar',
    },
    fr: {
      all_games:        'Tous les Jeux',
      recently_played:  'Joués Récemment',
      favorites:        'Favoris',
      arcade:           'Arcade',
      select_game:      'Sélectionner un Jeu',
      select_game_desc: 'Parcourez votre bibliothèque et sélectionnez un jeu pour voir les détails.',
      no_games_found:   'Aucun Jeu Trouvé',
      no_games_desc:    'Ajoutez des ROMs à votre bibliothèque pour commencer.',
      open_roms:        'Ouvrir le Dossier ROMs',
      last_played:      'Dernière Partie',
      play_time:        'Temps de Jeu',
      play_btn:         'Jouer',
      search_placeholder: 'Rechercher des jeux…',
      settings_title:   'Paramètres',
      tab_appearance:   'Apparence',
      tab_time:         'Heure',
      tab_language:     'Langue',
      tab_audio:        'Audio',
      tab_startup:      'Démarrage',
      tab_autosave:     'Sauvegarde Auto',
      tab_library:      'Bibliothèque',
      tab_emulator:     'Émulateur',
      tab_controls:     'Contrôles',
      save_btn:         'Enregistrer',
      apply_btn:        'Appliquer',
      cancel_btn:       'Annuler',
    },
  };

  let _lang = 'en';

  function t(key) {
    return TRANSLATIONS[_lang]?.[key] ?? TRANSLATIONS.en[key] ?? key;
  }

  function apply(lang) {
    _lang = TRANSLATIONS[lang] ? lang : 'en';
    document.documentElement.lang = _lang;

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (el.tagName === 'INPUT' && el.placeholder !== undefined) {
        el.placeholder = t(key);
      } else {
        el.textContent = t(key);
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
  }

  return { apply, t };
})();
