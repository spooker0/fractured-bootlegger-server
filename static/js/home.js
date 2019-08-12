$(document).ready(onReady);

function onReady() {
    $('#welcome-name').html('Welcome, ' + $('#hidden-username').val());

    $('#logout').on('click', logout);
    $('#install-files').on('click', installFiles);

    readVersion();
}

function logout() {
    window.location.href = '/logout';
}

function readVersion() {
    let launchBtn = $('#launch-game');
    if (window.interop) {
        window.interop.isInstalled(function (match) {
            if (match) {
                $('#install-files').html('Reinstall');
                launchBtn.removeClass('disabled');
                launchBtn.on('click', launchGame);
            } else {
                $('#install-files').html('Install');
                launchBtn.addClass('disabled');
                launchBtn.off('click');
            }
        });
    } else {
        console.log('Client launcher not detected!');
        launchBtn.on('click', () => {
            alert('Client launcher not detected!');
        });

    }
}

async function installFiles() {
    if (window.interop) {
        await window.interop.installFiles();
        readVersion();
    } else {
        alert('Client launcher not detected!');
    }
}

function launchGame() {
    let launchBtn = $('#launch-game');
    if (window.interop) {
        window.interop.launchGame(function () {
            launchBtn.removeClass('disabled');
            launchBtn.on('click', launchGame);
        });
        launchBtn.addClass('disabled');
        launchBtn.off('click');
    } else {
        alert('Client launcher not detected!');
    }
}