class DropDownController {
  handleEvent(event) {
    if (event.type === 'click' && event.target !== this.elem) {
      this.hideDropDown();
    }
  }

  triggerDropDown(elem) {
    if (this.elem === elem) {
      this.elem = null;
      elem.classList.toggle('expanded', false);
      return;
    }

    this.hideDropDown();
    this.elem = elem;
    document.addEventListener('click', this);
    elem.classList.toggle('expanded', true);
  }

  hideDropDown() {
    const { elem } = this;

    if (!elem) {
      return;
    }

    this.elem = null;
    document.removeEventListener('click', this);
    elem.classList.toggle('expanded', false);
  }
}

const dropDownController = new DropDownController();
export default dropDownController;
