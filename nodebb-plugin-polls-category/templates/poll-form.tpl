<div class="poll-form">
  <label for="poll-question">Poll Question:</label>
  <input type="text" id="poll-question" name="poll[question]" placeholder="Enter your question" required>

  <label>Options:</label>
  <div id="poll-options">
    <input type="text" name="poll[options][]" placeholder="Option 1" required>
    <input type="text" name="poll[options][]" placeholder="Option 2" required>
    <input type="text" name="poll[options][]" placeholder="Option 3">
  </div>

  <button type="button" id="add-option">Add another option</button>
</div>

<script>
  document.getElementById('add-option').addEventListener('click', () => {
    const optionsDiv = document.getElementById('poll-options');
    const inputCount = optionsDiv.querySelectorAll('input').length + 1;
    const newInput = document.createElement('input');
    newInput.type = 'text';
    newInput.name = 'poll[options][]';
    newInput.placeholder = 'Option ' + inputCount;
    optionsDiv.appendChild(newInput);
  });
</script>