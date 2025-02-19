// Initialize score variables
let teamAScore = 0;
let teamBScore = 0;

// Global variable to store team data
let teamsData = [];

// NEW: Track if we are currently editing an existing row
let isEditing = false;
let editingRowIndex = null;

// Wait for the DOM to load before executing scripts
document.addEventListener("DOMContentLoaded", () => {
  // Set the current time in the 'Time' input field
  document.getElementById('time').value = new Date().toLocaleString();
  fetchTeams(); // Fetch team data from the server or cache
});

// Function to fetch teams from sessionStorage or server
async function fetchTeams() {
  const storedTeams = sessionStorage.getItem('teams');
  if (storedTeams) {
    // If teams are stored in sessionStorage, parse and use them
    const teams = JSON.parse(storedTeams);
    teamsData = teams; // Cache the teams data globally
    populateTeamOptions(teams);
  } else {
    // If not, fetch from the server
    try {
      const response = await fetch('https://script.google.com/macros/s/AKfycbz7Dt-au2pT1VoHY0aclvtxyRxBR2tig6kp_R7Cw9Gij9_U6D3h_YaI4fo55VLbzXaS/exec');
      const teams = await response.json();
      teamsData = teams; // Cache the teams data globally
      sessionStorage.setItem('teams', JSON.stringify(teams)); // Store in sessionStorage for future use
      populateTeamOptions(teams);
    } catch (error) {
      console.error('Error fetching team names:', error);
    }
  }
}

// Function to populate the team selection dropdowns
function populateTeamOptions(teams) {
  const teamASelect = document.getElementById('teamA');
  const teamBSelect = document.getElementById('teamB');
  // Get unique team names using a Set
  const uniqueTeams = [...new Set(teams.map(item => item.teamA))];

  // Create document fragments for efficient DOM updates
  const fragmentA = document.createDocumentFragment();
  const fragmentB = document.createDocumentFragment();

  uniqueTeams.forEach(team => {
    // Create option elements for each team
    const optionA = document.createElement('option');
    optionA.value = team;
    optionA.textContent = team;
    fragmentA.appendChild(optionA);

    const optionB = document.createElement('option');
    optionB.value = team;
    optionB.textContent = team;
    fragmentB.appendChild(optionB);
  });

  // Append all options at once to the select elements
  teamASelect.appendChild(fragmentA);
  teamBSelect.appendChild(fragmentB);

  // Add event listeners to update player lists when team selection changes
  teamASelect.addEventListener('change', () => updatePlayerList('teamA'));
  teamBSelect.addEventListener('change', () => updatePlayerList('teamB'));
}

// Function to update the player list for the selected team
function updatePlayerList(team) {
  // Use the cached teamsData instead of parsing sessionStorage again
  const selectedTeam = document.getElementById(team).value;
  const playerListElement = document.getElementById(`${team}List`);

  // Filter players belonging to the selected team and sort alphabetically
  const players = teamsData
    .filter(item => item.teamA === selectedTeam)
    .map(item => item.teamB)
    .sort();

  // Display players in the textarea, one per line
  playerListElement.value = players.join('\n');

  // Adjust the height of the textarea to fit the content
  playerListElement.style.height = 'auto';
  playerListElement.style.height = (playerListElement.scrollHeight) + 'px';
}

/**
 * Open the "Add or Edit Score" popup.
 * @param {string} team - 'A' or 'B'
 * @param {number} [rowIndex] - optional row index if editing
 */
function openPopup(team, rowIndex) {
  // Display the overlay and popup
  document.getElementById('overlay').style.display = 'block';
  document.getElementById('scorePopup').style.display = 'block';

  const scorerDropdown = document.getElementById('scorer');
  const assistDropdown = document.getElementById('assist');
  const popupTitle = document.getElementById('popupTitle');
  const confirmBtn = document.getElementById('confirmScoreBtn');

  // Reset the dropdowns
  scorerDropdown.innerHTML = '<option value="">Select Scorer</option>';
  assistDropdown.innerHTML = '<option value="">Select Assist</option>';

  // Get the list of players for the selected team
  const playersText = document.getElementById(team === 'A' ? 'teamAList' : 'teamBList').value;
  const players = playersText ? playersText.split('\n') : [];

  // Create document fragments for efficient DOM updates
  const fragmentScorer = document.createDocumentFragment();
  const fragmentAssist = document.createDocumentFragment();

  players.forEach(player => {
    // Create option elements for scorer and assist
    const optionScorer = document.createElement('option');
    optionScorer.value = player;
    optionScorer.textContent = player;
    fragmentScorer.appendChild(optionScorer);

    const optionAssist = document.createElement('option');
    optionAssist.value = player;
    optionAssist.textContent = player;
    fragmentAssist.appendChild(optionAssist);
  });

  // Append all options at once to the dropdowns
  scorerDropdown.appendChild(fragmentScorer);
  assistDropdown.appendChild(fragmentAssist);

  // Store the team in the popup's dataset
  document.getElementById('scorePopup').dataset.team = team;

  if (typeof rowIndex === 'number') {
    // CHANGED: We are editing an existing row
    isEditing = true;
    editingRowIndex = rowIndex;
    popupTitle.textContent = 'Edit Score';
    confirmBtn.value = 'Update Score';

    // Fill in existing data from the row's dataset
    const rowElement = document.getElementById('scoringTableBody').children[rowIndex];
    const existingScorer = rowElement.dataset.scorer;
    const existingAssist = rowElement.dataset.assist;

    scorerDropdown.value = existingScorer;
    assistDropdown.value = existingAssist;
  } else {
    // CHANGED: We are adding a new score
    isEditing = false;
    editingRowIndex = null;
    popupTitle.textContent = 'Add Score';
    confirmBtn.value = 'Add Score';
  }
}

// CHANGED: Single function that branches for "add" or "update"
function confirmScore() {
  if (isEditing) {
    updateScoreRow();
  } else {
    addScore();
  }
}

// Function to add a NEW score entry to the scoring table
function addScore() {
  const team = document.getElementById('scorePopup').dataset.team;
  const scorer = document.getElementById('scorer').value;
  const assist = document.getElementById('assist').value;

  if (scorer && assist) {
    const scoringTableBody = document.getElementById('scoringTableBody');
    // Determine the new row's index
    const newRowIndex = scoringTableBody.children.length;

    const row = document.createElement('tr');
    // Store relevant data in dataset
    row.dataset.team = team;
    row.dataset.scorer = scorer;
    row.dataset.assist = assist;

    // Create the row content based on which team scored
    if (team === 'A') {
      row.innerHTML = `
        <td>${scorer}</td>
        <td>${assist}</td>
        <td class="total"></td>
        <td></td>
        <td></td>
        <!-- NEW: "Edit" button calls openPopup in edit mode -->
        <td><button type="button" onclick="openPopup('A', ${newRowIndex})">Edit</button></td>
      `;
    } else {
      row.innerHTML = `
        <td></td>
        <td></td>
        <td class="total"></td>
        <td>${scorer}</td>
        <td>${assist}</td>
        <!-- NEW: "Edit" button calls openPopup in edit mode -->
        <td><button type="button" onclick="openPopup('B', ${newRowIndex})">Edit</button></td>
      `;
    }

    // Append the new row to the scoring table
    scoringTableBody.appendChild(row);

    // Update the cumulative score
    updateScore(team);

    // Update the 'Total' cell with the current cumulative score
    const totalCell = row.querySelector('.total');
    totalCell.textContent = `${teamAScore}:${teamBScore}`;

    // Log data into sessionStorage
    logScoreData(team, scorer, assist);

    // Close the popup
    closePopup();
  } else {
    alert('Please select both scorer and assist.');
  }
}

// NEW: Function to update an EXISTING row with new scorer/assist
function updateScoreRow() {
  const team = document.getElementById('scorePopup').dataset.team;
  const scorer = document.getElementById('scorer').value;
  const assist = document.getElementById('assist').value;

  if (!scorer || !assist) {
    alert('Please select both scorer and assist.');
    return;
  }

  // Fetch the existing row
  const scoringTableBody = document.getElementById('scoringTableBody');
  const row = scoringTableBody.children[editingRowIndex];

  // Update the dataset
  row.dataset.scorer = scorer;
  row.dataset.assist = assist;

  // Update the row's displayed text
  if (team === 'A') {
    row.cells[0].textContent = scorer; // Score A cell
    row.cells[1].textContent = assist; // Assist A cell
    // cells[2] is the total
    row.cells[3].textContent = '';     // Score B cell
    row.cells[4].textContent = '';     // Assist B cell
  } else {
    row.cells[0].textContent = '';     
    row.cells[1].textContent = '';     
    // cells[2] is the total
    row.cells[3].textContent = scorer; // Score B cell
    row.cells[4].textContent = assist; // Assist B cell
  }

  // The "Total" cell (cell[2]) doesn't change, because the team is the same
  // and the scoreboard total doesn't need re-calculating for a simple
  // scorer/assist edit. If you want advanced behavior (like switching from
  // A to B and re-adjusting the scoreboard) you can handle that here.

  // Update the logs in sessionStorage
  updateScoreLogs(row);

  // Close the popup
  closePopup();
}

// NEW: update the logs in sessionStorage to reflect an edited row
function updateScoreLogs(row) {
  let scoreLogs = JSON.parse(sessionStorage.getItem('scoreLogs')) || [];
  const teamAName = document.getElementById('teamA').value;
  const teamBName = document.getElementById('teamB').value;
  const gameID = `${teamAName} vs ${teamBName}`;

  // We'll simply create a new log entry to replace the old one with matching
  // "team" and the same position in the logs. 
  // A more robust approach might track timestamps/IDs. This is a simple approach.
  
  // The old log is the same index as this row in the table if you always
  // add logs in order. If the user has many rows, you may need a more reliable
  // way to match them. For simplicity, let's just remove the old entry and add a new one.

  const rowTeam = row.dataset.team === 'A' ? teamAName : teamBName;
  const newLogEntry = {
    GameID: gameID,
    Time: new Date().toLocaleString(),
    Team: rowTeam,
    Score: row.dataset.scorer,
    Assist: row.dataset.assist
  };

  // We'll remove the old log if it matches the row's old data.
  // This is a naive approach, but sufficient for a quick demo.
  scoreLogs = scoreLogs.filter(log => {
    return !(
      log.Team === rowTeam &&
      log.Score === row.dataset.scorer &&
      log.Assist === row.dataset.assist
    );
  });

  // Add the newly updated entry
  scoreLogs.push(newLogEntry);
  sessionStorage.setItem('scoreLogs', JSON.stringify(scoreLogs));
}

// Function to log the score data into sessionStorage
function logScoreData(teamLetter, scorer, assist) {
  // Retrieve existing score logs from sessionStorage or initialize as empty array
  let scoreLogs = JSON.parse(sessionStorage.getItem('scoreLogs')) || [];

  // Get the selected teams
  const teamAName = document.getElementById('teamA').value;
  const teamBName = document.getElementById('teamB').value;

  // Check if both teams are selected
  if (!teamAName || !teamBName) {
    alert('Please select both Team A and Team B before adding scores.');
    return;
  }

  // Create the GameID
  const gameID = `${teamAName} vs ${teamBName}`;

  // Get the time of logging
  const timeOfLogging = new Date().toLocaleString();

  // Determine the team who scored
  const teamName = teamLetter === 'A' ? teamAName : teamBName;

  // Create the log object
  const logEntry = {
    GameID: gameID,
    Time: timeOfLogging,
    Team: teamName,
    Score: scorer,
    Assist: assist
  };

  // Add the new log entry to the array
  scoreLogs.push(logEntry);

  // Save the updated array back to sessionStorage
  sessionStorage.setItem('scoreLogs', JSON.stringify(scoreLogs));
}

// Function to update the cumulative score
function updateScore(team) {
  if (team === 'A') {
    teamAScore += 1;
  } else if (team === 'B') {
    teamBScore += 1;
  }
}

// Function to close the popup
function closePopup() {
  document.getElementById('overlay').style.display = 'none';
  document.getElementById('scorePopup').style.display = 'none';
}

// Function to submit the scores to Google Sheets
async function submitScore() {
  // Retrieve the logged data from sessionStorage
  const scoreLogs = JSON.parse(sessionStorage.getItem('scoreLogs')) || [];

  if (scoreLogs.length === 0) {
    alert('No scores have been logged.');
    return;
  }

  // Prepare the data to send
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
    // Send the data to the Google Apps Script web app
    await fetch(
      'https://script.google.com/macros/s/AKfycbwuFfudZfBeMklLVA8lR86dYpEHHVwkhyB_dj661RpbLivWOd1x2XzjSqSITDewzTE/exec',
      {
        method: 'POST',
        mode: 'no-cors', // 'no-cors' to prevent CORS issues
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      }
    );

    // Assume success and display the success message
    document.getElementById('successMessage').textContent =
      'Data has been successfully exported to Google Sheets!';
    document.getElementById('successMessage').style.display = 'block';

    // Clear the sessionStorage and (optionally) reset the form
    sessionStorage.removeItem('scoreLogs');
  } catch (error) {
    alert('Error exporting data: ' + error.message);
  }
}
