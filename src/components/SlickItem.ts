import { h, defineComponent } from 'vue';
import { ElementMixin } from '../ElementMixin';

export const SlickItem = defineComponent({
  name: 'SlickItem',
  mixins: [ElementMixin],
  compatConfig: {
    MODE: 3,
  },
  props: {
    tag: {
      type: String,
      default: 'div',
    },
  },
  render() {
    return h(this.tag, this.$slots.default?.());
  },
});
