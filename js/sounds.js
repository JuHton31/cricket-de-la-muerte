/**
 * CRICKET DE LA MUERTE — Système de Sons
 * Utilise des fichiers MP3 pour les sons
 * Sons de ricochet et vibrations
 */

const SoundsManager = (() => {
    let soundsEnabled = true;
    let vibrationsEnabled = true;

    // Précharger les sons au démarrage (avec cache buster pour forcer le rechargement)
    const sounds = {
        hit: new Audio('/sounds/SF-ricochet-4.mp3?v=3'),
        miss: new Audio('/sounds/sf_pet_10.mp3?v=3')
    };

    console.log('[Sounds] Sons chargés:', sounds);

    /**
     * Jouer le son de hit (ricochet)
     */
    function playHit() {
        if (!soundsEnabled) return;

        try {
            // Créer une nouvelle instance pour pouvoir jouer plusieurs fois rapidement
            const audio = sounds.hit.cloneNode();
            audio.volume = 0.7;
            audio.play().catch(e => console.warn('Erreur lecture son:', e));
        } catch (e) {
            console.warn('Erreur son hit:', e);
        }
    }

    /**
     * Jouer le son de raté
     */
    function playMissSound() {
        if (!soundsEnabled) return;

        try {
            const audio = sounds.miss.cloneNode();
            audio.volume = 0.8;
            audio.play().catch(e => console.warn('Erreur lecture son:', e));
        } catch (e) {
            console.warn('Erreur son miss:', e);
        }
    }

    /**
     * Vibration du téléphone
     * Patterns différents selon le contexte
     */
    function vibrate(pattern = [100]) {
        if (!vibrationsEnabled) return;
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }

    /**
     * Vibration courte (fléchette simple)
     */
    function vibrateShort() {
        vibrate([50]);
    }

    /**
     * Vibration double (double ou triple)
     */
    function vibrateDouble() {
        vibrate([50, 50, 50]);
    }

    /**
     * Vibration de fermeture de numéro
     */
    function vibrateClosed() {
        vibrate([100, 50, 100]);
    }

    /**
     * Vibration de victoire
     */
    function vibrateVictory() {
        vibrate([200, 100, 200, 100, 300]);
    }

    /**
     * Activer/désactiver les sons
     */
    function toggleSounds(enabled) {
        soundsEnabled = enabled;
        localStorage.setItem('cricketSoundsEnabled', enabled);
    }

    /**
     * Activer/désactiver les vibrations
     */
    function toggleVibrations(enabled) {
        vibrationsEnabled = enabled;
        localStorage.setItem('cricketVibrationsEnabled', enabled);
    }

    /**
     * Charger les préférences depuis localStorage
     */
    function loadSettings() {
        const sounds = localStorage.getItem('cricketSoundsEnabled');
        const vibrations = localStorage.getItem('cricketVibrationsEnabled');

        if (sounds !== null) {
            soundsEnabled = sounds === 'true';
        }

        if (vibrations !== null) {
            vibrationsEnabled = vibrations === 'true';
        }

        return { soundsEnabled, vibrationsEnabled };
    }

    /**
     * Obtenir l'état actuel des paramètres
     */
    function getSettings() {
        return { soundsEnabled, vibrationsEnabled };
    }

    /**
     * Effet combiné : son + vibration pour une fléchette
     * Tous les multiplicateurs utilisent le même son maintenant
     */
    function playDartHit(multiplier = 1) {
        playHit();

        if (multiplier === 1) {
            vibrateShort();
        } else {
            vibrateDouble();
        }
    }

    /**
     * Effet combiné : numéro fermé
     */
    function playNumberClosed() {
        playHit();
        vibrateClosed();
    }

    /**
     * Effet combiné : victoire
     */
    function playGameVictory() {
        playHit();
        vibrateVictory();
    }

    /**
     * Effet combiné : fléchette ratée
     */
    function playDartMiss() {
        playMissSound();
        vibrateShort();
    }

    // Compatibilité avec l'ancienne API (pour ne pas casser le code existant)
    function initAudioContext() {
        // Ne fait rien, juste pour compatibilité
    }

    async function resumeAudioContext() {
        // Ne fait rien, juste pour compatibilité
    }

    // API publique
    return {
        initAudioContext,
        resumeAudioContext,
        playDartHit,
        playNumberClosed,
        playGameVictory,
        playDartMiss,
        toggleSounds,
        toggleVibrations,
        loadSettings,
        getSettings
    };
})();
