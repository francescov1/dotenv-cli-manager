const chalk = require("chalk");
const cliCursor = require("cli-cursor");
const figures = require("figures");
const Base = require("inquirer/lib/prompts/base");
const Choices = require("inquirer/lib/objects/choices");
const observe = require("inquirer/lib/utils/events");
const Paginator = require("inquirer/lib/utils/paginator");
const Table = require("cli-table");
const { map, takeUntil } = require("rxjs/operators");

// TODO: this is a hack solution, when users submit we are re-adding listeners without properly cleaning up the previous ones, we need to ensure
// to clear all previous listeners before adding new ones
require('events').EventEmitter.defaultMaxListeners = 50;

// TODO: if someones value overwrites somethign in defaults, should highlight it to warn user
class TablePrompt extends Base {
  /**
   * Initialise the prompt
   *
   * @param  {Object} questions
   * @param  {Object} rl
   * @param  {Object} answers
   */
  constructor(questions, rl, answers) {
    super(questions, rl, answers);

    // hide columns by default, add `alias` to show/hide values
    const colums = this.opt.columns.map(column => {
      return { ...column, isHidden: true, alias: column.name[0].toLowerCase() };
    });

    this.columns = new Choices(colums, []);
    this.pointer = 0;
    this.horizontalPointer = 0;
    this.rows = new Choices(this.opt.rows, []);

    this.isEditingValue = false;
    this.isClearingValue = false;
    this.clearingValueName = undefined;
    this.clearingValueEnvironment = undefined;

    this.pageSize = this.opt.pageSize || 5;
  }

  /**
   * Start the inquirer session
   *
   * @param  {Function} callback
   * @return {TablePrompt}
   */
  _run(callback) {
    this.done = callback;

    const events = observe(this.rl);
    const validation = this.handleSubmitEvents(
      events.line.pipe(map(this.getCurrentValue.bind(this)))
    );
    validation.success.forEach(this.onEnd.bind(this));
    validation.error.forEach(this.onError.bind(this));

    events.keypress
    .pipe(takeUntil(validation.success))
    .forEach(({ key }) => {
      switch (key.name) {
        case "left":
          return this.onLeftKey();

        case "right":
          return this.onRightKey();
      }
    });

    events.normalizedUpKey
      .pipe(takeUntil(validation.success))
      .forEach(this.onUpKey.bind(this));
    events.normalizedDownKey
      .pipe(takeUntil(validation.success))
      .forEach(this.onDownKey.bind(this));
    events.spaceKey
      .pipe(takeUntil(validation.success))
      .forEach(this.onSpaceKey.bind(this));

    events.keypress
      .pipe(takeUntil(validation.success))
      .forEach(this.onKeyPress.bind(this));

    if (this.rl.line) {
      this.onKeypress();
    }

    cliCursor.hide();
    this.render();

    return this;
  }

  getCurrentValue() {
    if (this.isEditingValue) {
      return
    }

    return {
      rows: this.rows.choices.map(choice => ({
        name: choice.name,
        values: choice.values
      })),
      columns: this.columns.choices.map(choice => ({
        name: choice.name,
        value: choice.value
      }))
    };
  }

  getSelectedValue() {
    return this.rows.choices[this.pointer].values[this.horizontalPointer];
  }

  setSelectedValue(value) {
    this.rows.choices[this.pointer].values[this.horizontalPointer] = value;
  }

  onDownKey() {
    if (this.isEditingValue) return;

    const length = this.rows.realLength;

    this.pointer = this.pointer < length - 1 ? this.pointer + 1 : this.pointer;
    this.render();
  }

  onEnd(state) {
    if (this.isEditingValue) {
      this.isEditingValue = false;

      if (this.inlineEditorConfirmPrompt) {
        const answer = this.inlineEditorConfirmPrompt.replace(this.initialInlineEditorConfirmPrompt, '');
        if (answer.trim().toLowerCase() === 'y') {
          if (this.clearingValueEnvironment === 'all') {
            this.rows.choices.splice(this.pointer, 1);
          }
          else {
            this.rows.choices[this.pointer].values[this.horizontalPointer] = ''
          }
        }
        
        this.inlineEditorConfirmPrompt = undefined;
        this.initialInlineEditorConfirmPrompt = undefined;
        this.clearingValueName = undefined;
        this.clearingValueEnvironment = undefined;
      }
      else if (this.inlineEditorName) {
        this.setSelectedValue(this.inlineEditorValue);
        this.inlineEditorName = undefined
        this.inlineEditorValue = undefined
      }

      
      this.rl.removeAllListeners()
      this._run(this.done)
      return
    }
    
    this.screen.done();
    // cliCursor.show();
    this.done(state.value);
    // this.render();
  }

  onError(state) {
    this.render(state.isValid);
  }

  onLeftKey() {
    if (this.isEditingValue) {
      // this.editorPosition = this.editorPosition > 0 ? this.editorPosition-1 : this.editorPosition
      return;
    } else {
      const length = this.columns.realLength;

      this.horizontalPointer =
        this.horizontalPointer > 0 ? this.horizontalPointer - 1 : length - 1;
    }

    this.render();
  }

  onRightKey() {
    if (this.isEditingValue) {
      // const valLength = this.getSelectedValue().length
      // this.editorPosition = this.editorPosition < valLength ? this.editorPosition+1 : this.editorPosition
      return;
    } else {
      const length = this.columns.realLength;

      this.horizontalPointer =
        this.horizontalPointer < length - 1 ? this.horizontalPointer + 1 : 0;
    }

    this.render();
  }



  async onKeyPress(keyPressed) {
    if (this.isEditingValue) {
      const key = this.inlineEditorConfirmPrompt ? 'inlineEditorConfirmPrompt' : 'inlineEditorValue'
      if (keyPressed.key.name === 'backspace') {

        // skip backspace if we are at the beginning of the prompt
        if (this.inlineEditorConfirmPrompt && this.inlineEditorConfirmPrompt === this.initialInlineEditorConfirmPrompt) {
          return
        }

        this[key] = this[key].slice(0, -1);
      }
      else if (keyPressed.value) {
        this[key] += keyPressed.value;
      }
      
      this.render()
      return
    };

    // check if this was a "hide" key & hide the associated column if so
    const column = this.columns.find(column => column.alias === keyPressed.value);
    if (column) {
      column.isHidden = !column.isHidden;
      this.render();
      return
    }

    if (keyPressed.value === 'x') {
      const { name } = this.rows.choices[this.pointer];
      this.isEditingValue = true;

      const { name: envName } = this.columns.choices[this.horizontalPointer];
      
      this.initialInlineEditorConfirmPrompt = `Clear variable "${name}" from environment "${envName}"? (Y/n) `;
      this.inlineEditorConfirmPrompt = this.initialInlineEditorConfirmPrompt
      this.clearingValueName = name;
      this.clearingValueEnvironment = envName;
      
      this.render()
    }
    // check if this was a "backspace key"
    else if (keyPressed.value === '\x7F') {
      const { name } = this.rows.choices[this.pointer];
      this.isEditingValue = true;
      
      this.initialInlineEditorConfirmPrompt = `Clear variable "${name}" from all environments? (Y/n) `;
      this.inlineEditorConfirmPrompt = this.initialInlineEditorConfirmPrompt;
      this.clearingValueName = name;
      this.clearingValueEnvironment = 'all';
      this.render()
    }

    // TODO: for adding a new value, cretae a 'prompt' helper so that we can easily re-use logic from the confirm prompt stuff
  }

  async onSpaceKey() {
    if (this.isEditingValue) return;

    this.isEditingValue = true;

    const { name, values } = this.rows.choices[this.pointer];
    const value = values[this.horizontalPointer];

    // this.rl.pause();

    this.inlineEditorName = name
    this.inlineEditorValue = value;

    // this.editorPosition = this.getSelectedValue().length
    this.render();
  }

  onUpKey() {
    if (this.isEditingValue) return;

    this.pointer = this.pointer > 0 ? this.pointer - 1 : this.pointer;
    this.render();
  }

  paginate() {
    const middleOfPage = Math.floor(this.pageSize / 2);
    const firstIndex = Math.max(0, this.pointer - middleOfPage);
    const lastIndex = Math.min(
      firstIndex + this.pageSize - 1,
      this.rows.realLength - 1
    );
    const lastPageOffset = this.pageSize - 1 - lastIndex + firstIndex;

    return [Math.max(0, firstIndex - lastPageOffset), lastIndex];
  }

  render(error) {
    let message = this.getQuestion();
    let bottomContent = "";

    message +=
      "\n(Press " +
      chalk.cyan.bold("<l> <d> <p> <t>") +
      " to show/hide column, " +
      chalk.cyan.bold("<Up> <Down> <Left> <Right>") +
      " to navigate, " +
      chalk.cyan.bold("<space>") +
      " to edit, " +
      chalk.cyan.bold("<n>") +
      " to add a new variable, " +
      chalk.cyan.bold("<x>") +
      " to delete a variable from the selected environment, " +
      chalk.cyan.bold("<delete>") +
      " to delete a variable from all environments, " +
      chalk.cyan.bold("<enter>") +
      " to save)";

    const [firstIndex, lastIndex] = this.paginate();

    const table = new Table({
      head: [
        chalk.reset.dim(
          `${firstIndex + 1}-${lastIndex + 1} of ${this.rows.realLength}`
        )
      ].concat(
        this.columns.choices.map((column, columnIndex) => {
          return chalk.reset.bold(
            `${column.name} (${column.alias}) ${column.isHidden ? "🔒" : "👀"}`
          );
        })
      )
    });

    this.rows.forEach((row, rowIndex) => {
      if (rowIndex < firstIndex || rowIndex > lastIndex) return;

      const columnValues = [];

      this.columns.forEach((column, columnIndex) => {
        const isSelected =
          this.status !== "answered" &&
          this.pointer === rowIndex &&
          this.horizontalPointer === columnIndex;

        const value = row.values[columnIndex];

        let valueLabel;
        // if (this.isEditingValue && isSelected) {
        //   valueLabel = value.slice(0, this.editorPosition) + "|" + value.slice(this.editorPosition);
        // }
        // else {
        valueLabel = column.isHidden
          ? new Array(value?.length).fill(figures.star).join("")
          : value;
        // }

        columnValues.push(
          `${isSelected ? "[" : " "} ${valueLabel} ${isSelected ? "]" : " "}`
        );
      });

      const chalkModifier =
        this.status !== "answered" && this.pointer === rowIndex
          ? chalk.reset.bold.cyan
          : chalk.reset;

      table.push({
        [chalkModifier(row.name)]: columnValues
      });
    });

    message += "\n\n" + table.toString();

    if (error) {
      bottomContent = chalk.red(">> ") + error;
    }
    else if (this.inlineEditorValue) {
      bottomContent = chalk.green(this.inlineEditorName) + chalk.bold(" = ") + this.inlineEditorValue;
    }
    else if (this.inlineEditorConfirmPrompt) {
      bottomContent = chalk.green(this.inlineEditorConfirmPrompt)
    }

    this.screen.render(message, bottomContent);
  }
}

module.exports = TablePrompt;
