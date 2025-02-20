// Initialize score variables
let teamAScore = 0;
let teamBScore = 0;

// Global variable to store team data
let teamsData = [];

// Variable for loading animation interval
let loadingInterval;

// Tracks if we're editing an existing score
// If null => adding new
// If set to an ID => editing
let currentEditID = null;

document.addEventListener("DOMContentLoaded", () => {
  // Set the current time
  document.getElementById('time').value = new Date().toLocaleString();
  fetchTeams();
});

// ------------- Fetch Teams -------------
async function fetchTeams() {
  const storedTeams = sessionStorage.getItem('teams');
  if (storedTeams) {
    teamsData = JSON.parse(storedTeams);
    populateTeamOptions(teamsData);
  } else {
    try {
      const response = await fetch(
        'https://script.google.com/macros/s/AKfycbzcg2i_dSDPwpgs5aHZz6glU4K0z2K6A3CfNxrinzDDff9rYQ6uSA35Btp2hUebFU4/exec'
      );
      const teams = await response.json();
      teamsData = teams;
      sessionStorage.setItem('teams', JSON.stringify(teams));
      populateTeamOptions(teams);
    } catch (error) {
      console.error('Error fetching team names:', error);
    }
  }
}

// ------------- Populate Team Options -------------
function populateTeamOptions(teams) {
  const teamASelect = document.getElementById('teamA');
  const teamBSelect = document.getElementById('teamB');

  const uniqueTeams = [...new Set(teams.map(item => item.teamA))];

  const fragmentA = document.createDocumentFragment();
  const fragmentB = document.createDocumentFragment();

  uniqueTeams.forEach(team => {
    const optionA = document.createElement('option');
    optionA.value = team;
    optionA.textContent = team;
    fragmentA.appendChild(optionA);

    const optionB = document.createElement('option');
    optionB.value = team;
    optionB.textContent = team;
    fragmentB.appendChild(optionB);
  });

  teamASelect.appendChild(fragmentA);
  teamBSelect.appendChild(fragmentB);

  teamASelect.addEventListener('change', () => updatePlayerList('teamA'));
  teamBSelect.addEventListener('change', () => updatePlayerList('teamB'));
}

// ------------- Update Player List -------------
function updatePlayerList(team) {
  const selectedTeam = document.getElementById(team).value;
  const playerListElement = document.getElementById(`${team}List`);

  const players = teamsData
    .filter(item => item.teamA === selectedTeam)
    .map(item => item.teamB)
    .sort();

  playerListElement.value = players.join('\n');
  playerListElement.style.height = 'auto';
  playerListElement.style.height = playerListElement.scrollHeight + 'px';
}

// ------------- Open Popup -------------
function openPopup(team) {
  currentEditID = null; // We're adding a new score

  // Show the popup
  document.getElementById('overlay').style.display = 'block';
  document.getElementById('scorePopup').style.display = 'block';

  // Popup title & button
  document.getElementById('popupTitle').textContent = 'Add Score';
  document.getElementById('popupButton').value = 'Add Score';

  // Store the team ("A" or "B") in the popup’s data attribute
  document.getElementById('scorePopup').dataset.team = team;

  // Clear out existing options in Scorer & Assist dropdowns
  const scorerDropdown = document.getElementById('scorer');
  const assistDropdown = document.getElementById('assist');
  scorerDropdown.innerHTML = '<option value="">Select Scorer</option>';
  assistDropdown.innerHTML = '<option value="">Select Assist</option>';

  // Read the relevant team’s textarea (teamAList or teamBList)
  const playersText = document.getElementById(
    team === 'A' ? 'teamAList' : 'teamBList'
  ).value;
  const players = playersText ? playersText.split('\n') : [];

  // Populate scorer/assist dropdowns with the team's players
  players.forEach(player => {
    const optionScorer = document.createElement('option');
    optionScorer.value = player;
    optionScorer.textContent = player;
    scorerDropdown.appendChild(optionScorer);

    const optionAssist = document.createElement('option');
    optionAssist.value = player;
    optionAssist.textContent = player;
    assistDropdown.appendChild(optionAssist);
  });

  // Finally, add "N/A" at the bottom of each dropdown
  const naOptionScorer = document.createElement('option');
  naOptionScorer.value = 'N/A';
  naOptionScorer.textContent = 'N/A';
  scorerDropdown.appendChild(naOptionScorer);

  const naOptionAssist = document.createElement('option');
  naOptionAssist.value = 'N/A';
  naOptionAssist.textContent = 'N/A';
  assistDropdown.appendChild(naOptionAssist);
}


// ------------- Save Score (Add or Edit) -------------
function saveScore() {
  const popup = document.getElementById('scorePopup');
  const team = popup.dataset.team; // "A" or "B"
  const scorer = document.getElementById('scorer').value;
  const assist = document.getElementById('assist').value;

  if (!scorer || !assist) {
    alert('Please select both scorer and assist.');
    return;
  }

  let scoreLogs = JSON.parse(sessionStorage.getItem('scoreLogs')) || [];

  if (!currentEditID) {
    // ----- ADD NEW -----
    // Increase the scoreboard for whichever team
    if (team === 'A') teamAScore++;
    else teamBScore++;

    // Create a unique ID
    const newScoreID = Date.now().toString();
    const logEntry = createLogObject(newScoreID, team, scorer, assist);

    scoreLogs.push(logEntry);
    sessionStorage.setItem('scoreLogs', JSON.stringify(scoreLogs));

    // Add a new row
    const scoringTableBody = document.getElementById('scoringTableBody');
    const newRow = createScoreRow(logEntry);
    scoringTableBody.appendChild(newRow);

    closePopup();
  } else {
    // ----- EDIT EXISTING -----
    const index = scoreLogs.findIndex(log => log.scoreID === currentEditID);
    if (index === -1) {
      alert('Could not find this score log to edit.');
      return;
    }
    // We do NOT allow changing the team (only scorer/assist).
    // So we do NOT modify scoreboard counters.
    scoreLogs[index].Score = scorer;
    scoreLogs[index].Assist = assist;
    sessionStorage.setItem('scoreLogs', JSON.stringify(scoreLogs));

    // Update the table row
    const row = document.querySelector(`tr[data-score-id="${currentEditID}"]`);
    if (row) {
      // If it's team A, the Score/Assist go in columns 0,1
      // If it's team B, columns 3,4
      const teamLetter = popup.dataset.team; // same as old
      if (teamLetter === 'A') {
        row.cells[0].textContent = scorer; 
        row.cells[1].textContent = assist;
      } else {
        row.cells[3].textContent = scorer; 
        row.cells[4].textContent = assist;
      }
    }

    closePopup();
  }
}

// ------------- Create Log Object -------------
function createLogObject(scoreID, teamLetter, scorer, assist) {
  const teamAName = document.getElementById('teamA').value;
  const teamBName = document.getElementById('teamB').value;
  const gameID = `${teamAName} vs ${teamBName}`;
  const teamName = (teamLetter === 'A') ? teamAName : teamBName;

  return {
    scoreID: scoreID,
    GameID: gameID,
    Time: new Date().toLocaleString(),
    Team: teamName,
    Score: scorer,
    Assist: assist
  };
}

// ------------- Create Score Row -------------
function createScoreRow(logEntry) {
  const teamAName = document.getElementById('teamA').value;
  const teamLetter = (logEntry.Team === teamAName) ? 'A' : 'B';
  const row = document.createElement('tr');

  row.setAttribute('data-score-id', logEntry.scoreID);

  // The scoreboard at the time of adding
  const scoreboard = `${teamAScore}:${teamBScore}`;

  if (teamLetter === 'A') {
    row.innerHTML = `
      <td>${logEntry.Score}</td>
      <td>${logEntry.Assist}</td>
      <td class="total">${scoreboard}</td>
      <td></td>
      <td></td>
      <td><button type="button" class="edit-btn">Edit</button></td>
    `;
  } else {
    row.innerHTML = `
      <td></td>
      <td></td>
      <td class="total">${scoreboard}</td>
      <td>${logEntry.Score}</td>
      <td>${logEntry.Assist}</td>
      <td><button type="button" class="edit-btn">Edit</button></td>
    `;
  }

  // Attach edit listener
  row.querySelector('.edit-btn').addEventListener('click', () => {
    editScore(logEntry.scoreID);
  });

  return row;
}

// ------------- Edit Score -------------
function editScore(scoreID) {
  let scoreLogs = JSON.parse(sessionStorage.getItem('scoreLogs')) || [];
  const logToEdit = scoreLogs.find(l => l.scoreID === scoreID);
  if (!logToEdit) {
    alert('Could not find this score log!');
    return;
  }

  currentEditID = scoreID;

  // Show popup in edit mode
  document.getElementById('overlay').style.display = 'block';
  document.getElementById('scorePopup').style.display = 'block';
  document.getElementById('popupTitle').textContent = 'Edit Score';
  document.getElementById('popupButton').value = 'Update Score';

  // Determine if it's A or B
  const teamAName = document.getElementById('teamA').value;
  const teamLetter = (logToEdit.Team === teamAName) ? 'A' : 'B';

  // Store that in dataset (but no user dropdown)
  document.getElementById('scorePopup').dataset.team = teamLetter;

  // Rebuild scorer/assist dropdowns
  const scorerDropdown = document.getElementById('scorer');
  const assistDropdown = document.getElementById('assist');

  scorerDropdown.innerHTML = '<option value="">Select Scorer</option>';
  assistDropdown.innerHTML = '<option value="">Select Assist</option>';

  const playersText = document.getElementById(
    teamLetter === 'A' ? 'teamAList' : 'teamBList'
  ).value;
  const players = playersText ? playersText.split('\n') : [];

  players.forEach(player => {
    const optionScorer = document.createElement('option');
    optionScorer.value = player;
    optionScorer.textContent = player;
    scorerDropdown.appendChild(optionScorer);

    const optionAssist = document.createElement('option');
    optionAssist.value = player;
    optionAssist.textContent = player;
    assistDropdown.appendChild(optionAssist);
  });

  // Pre-fill
  scorerDropdown.value = logToEdit.Score;
  assistDropdown.value = logToEdit.Assist;
}

// ------------- Close Popup -------------
function closePopup() {
  document.getElementById('overlay').style.display = 'none';
  document.getElementById('scorePopup').style.display = 'none';
}

// ------------- Loading Animation -------------
function startLoadingAnimation() {
  const loadingAnimation = document.getElementById('loadingAnimation');
  const dots = document.getElementById('dots');
  let dotCount = 0;

  loadingAnimation.style.display = 'block';
  loadingInterval = setInterval(() => {
    dotCount = (dotCount + 1) % 4; 
    dots.textContent = '.'.repeat(dotCount);
  }, 500);
}

function stopLoadingAnimation() {
  const loadingAnimation = document.getElementById('loadingAnimation');
  const dots = document.getElementById('dots');
  clearInterval(loadingInterval);
  dots.textContent = '';
  loadingAnimation.style.display = 'none';
}

// ------------- Submit Score -------------
async function submitScore() {
  const scoreLogs = JSON.parse(sessionStorage.getItem('scoreLogs')) || [];
  if (scoreLogs.length === 0) {
    alert('No scores have been logged.');
    return;
  }
  const teamAName = document.getElementById('teamA').value;
  const teamBName = document.getElementById('teamB').value;
  const gameID = `${teamAName} vs ${teamBName}`;
  const date = new Date().toLocaleDateString();

  const dataToSend = {
    GameID: gameID,
    Date: date,
    logs: scoreLogs
  };

  try {
    startLoadingAnimation();

    await fetch(
      'https://script.google.com/macros/s/AKfycbzcg2i_dSDPwpgs5aHZz6glU4K0z2K6A3CfNxrinzDDff9rYQ6uSA35Btp2hUebFU4/exec',
      {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      }
    );

    stopLoadingAnimation();
    document.getElementById('successMessage').textContent = 'Data has been successfully exported!';
    document.getElementById('successMessage').style.display = 'block';

    sessionStorage.removeItem('scoreLogs');
    // Optionally reset scoreboard, etc.
    // teamAScore = 0;
    // teamBScore = 0;
  } catch (error) {
    stopLoadingAnimation();
    alert('Error exporting data: ' + error.message);
  }
}
