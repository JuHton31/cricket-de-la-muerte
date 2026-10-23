const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');

const source = readFileSync(join(__dirname, 'js/game301.js'), 'utf8');

// Exécuter le vrai gestionnaire avec des substituts pour le DOM, les sons et IndexedDB.
function createManager(storage = new Map()) {
    const store = {
        put(value) {
            storage.set(value.id, structuredClone(value));
        },
        get(id) {
            const request = {};
            queueMicrotask(() => {
                request.result = structuredClone(storage.get(id));
                request.onsuccess();
            });
            return request;
        }
    };
    const element = {
        classList: { add() {}, toggle() {} },
        querySelector() { return null; }
    };
    const context = {
        indexedDB: {
            open() {
                const request = {};
                queueMicrotask(() => {
                    request.result = {
                        transaction() { return { objectStore() { return store; } }; }
                    };
                    request.onsuccess();
                });
                return request;
            }
        },
        document: { getElementById() { return element; } },
        setTimeout() {},
        console: { log() {} },
        SoundsManager: { playDartHit() {}, playDartMiss() {}, playGameVictory() {} },
        StatsManager: { async saveGameToHistory() {} },
        App: { navigateToScreen() {} },
        GameManager: { renderGameOver() {} }
    };
    return runInNewContext(`${source}\nGameManager301;`, context);
}

async function startAt(remaining, storage) {
    const manager = createManager(storage);
    await manager.startNewGame301([
        { id: 1, name: 'Joueur 1', avatar: '' },
        { id: 2, name: 'Joueur 2', avatar: '' }
    ]);
    const player = manager.getCurrentPlayer();
    player.score = 301 - remaining;
    player.remaining = remaining;
    return manager;
}

async function throwDarts(manager, darts) {
    let result;
    for (const [number, multiplier = 1] of darts) {
        result = await manager.recordDart301(number, multiplier);
    }
    return result;
}

for (const { name, darts } of [
    { name: 'dépassement à la première fléchette', darts: [[20, 2]] },
    { name: 'dépassement à la deuxième fléchette', darts: [[12], [20]] },
    { name: 'exemple 30 → 10, 12, 11', darts: [[10], [12], [11]] },
    { name: 'dépassement après un raté', darts: [[0, 0], [12], [20]] },
    { name: 'dépassement après un double', darts: [[5, 2], [12], [11]] },
    { name: 'dépassement après un triple', darts: [[4, 3], [10], [11]] },
    { name: 'un point restant', darts: [[10], [12], [7]] },
    { name: 'sortie interdite sur un simple', darts: [[10], [12], [8]] }
]) {
    test(`Bust : ${name} annule toute la volée`, async () => {
        const manager = await startAt(30);
        const player = manager.getCurrentPlayer();
        const result = await throwDarts(manager, darts);
        const state = manager.getCurrentGameState();

        assert.equal(result.bust, true);
        assert.equal(result.gameOver, false);
        assert.equal(player.remaining, 30);
        assert.equal(player.score, 271);
        assert.equal(player.dartsThrown, darts.length);
        assert.equal(player.currentRound.length, 0);
        assert.equal(player.lastRound.length, darts.length);
        assert.equal(player.roundsHistory.length, 1);
        assert.equal(player.roundsHistory[0].bust, true);
        assert.equal(player.roundsHistory[0].totalPoints, 0);
        assert.equal(state.currentPlayerIndex, 1);
        assert.equal(state.currentDart, 1);
        assert.equal(state.players[1].remaining, 301);

        await throwDarts(manager, [[0, 0], [0, 0], [0, 0]]);
        assert.equal(manager.getCurrentPlayer(), player);
        assert.equal(player.remaining, 30);
        await manager.recordDart301(10, 1);
        assert.equal(player.remaining, 20);
    });
}

test('Une volée sans bust conserve les points marqués', async () => {
    const manager = await startAt(30);
    const player = manager.getCurrentPlayer();
    const result = await throwDarts(manager, [[10], [12], [2]]);

    assert.equal(result.bust, false);
    assert.equal(player.remaining, 6);
    assert.equal(player.score, 295);
    assert.equal(player.roundsHistory[0].totalPoints, 24);
    assert.equal(player.roundsHistory[0].bust, false);
});

for (const { name, darts } of [
    { name: 'double', darts: [[10], [12], [4, 2]] },
    { name: 'triple', darts: [[10], [11], [3, 3]] }
]) {
    test(`Une sortie exacte sur un ${name} reste gagnante`, async () => {
        const manager = await startAt(30);
        const player = manager.getCurrentPlayer();
        const result = await throwDarts(manager, darts);

        assert.equal(result.gameOver, true);
        assert.equal(result.winner, player);
        assert.equal(player.remaining, 0);
        assert.equal(player.score, 301);
    });
}

test('Le bust préserve les points des volées précédentes', async () => {
    const manager = await startAt(60);
    const player = manager.getCurrentPlayer();
    await throwDarts(manager, [[10], [10], [10]]);
    await throwDarts(manager, [[0, 0], [0, 0], [0, 0]]);
    await throwDarts(manager, [[10], [12], [11]]);

    assert.equal(player.remaining, 30);
    assert.equal(player.score, 271);
    assert.equal(player.roundsHistory.length, 2);
    assert.equal(player.roundsHistory[0].totalPoints, 30);
    assert.equal(player.roundsHistory[1].bust, true);
});

test('Annuler une fléchette en cours de volée ne fausse pas le retour au score initial', async () => {
    const manager = await startAt(30);
    const player = manager.getCurrentPlayer();
    await throwDarts(manager, [[10], [12]]);
    assert.equal(await manager.undoLastDart(), true);
    assert.equal(player.remaining, 20);
    await throwDarts(manager, [[11], [12]]);

    assert.equal(player.remaining, 30);
    assert.equal(player.score, 271);
});

test('Une partie reprise en milieu de volée restaure aussi le score initial', async () => {
    const storage = new Map();
    const manager = await startAt(30, storage);
    await throwDarts(manager, [[10], [12]]);

    const resumedManager = createManager(storage);
    assert.equal(await resumedManager.loadCurrentGame(), true);
    const player = resumedManager.getCurrentPlayer();
    assert.equal(player.remaining, 8);
    await resumedManager.recordDart301(11, 1);
    assert.equal(player.remaining, 30);
    assert.equal(player.score, 271);

    const reloadedManager = createManager(storage);
    assert.equal(await reloadedManager.loadCurrentGame(), true);
    const state = reloadedManager.getCurrentGameState();
    assert.equal(state.players[0].remaining, 30);
    assert.equal(state.currentPlayerIndex, 1);
    assert.equal(state.currentDart, 1);
});
