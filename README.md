# Model Memory Calculator

Out of Memory (OOMs) errors are hard to deal with, so we made this Model Memory Calculator to give you a headsup on whether your hardware is compatible with the models you're plannnig to run. 

## Require information:

- **Model**: You can either select a model from the drop-down menu or enter the number of parameters manually.
- **Device**: You can either select a device from the drop-down menu or enter the memory manually.

### Optional

- **Batch Size**: This is the batch size that you want to use for inference.
- **Sequence Length**: This is the max sequence length that you want to use for inference.

## Model Footprint Chart

On provision of the required parameters you will be presented with the model's **footprint chart**. This shows the static memory usage of the model in different precisions, such as **FP32**, **FP16**, **INT8** and **INT4**.

If a **device** has been provided, the chart will update to show the memory usage of the model on that device, allowing you to see if a model will fit on the device. Bear in mind that the memory usage of the model during *inference* time will be higher than this value, as it does not take into account the *dynamic memory* usage of the model.

## Maximum Batch Size/ Sequence Length Chart

If you have selected a **custom model**, you will also need to input the **hidden size** and **number of layers** in order to see this chart. The details for these values can usually be found in the `config.json` file of the model on the HuggingFace hub.

This line shows the maximum **batch size** and **sequence length** combinations that can be used with the model on the selected device across different precisions. You can also specify a batch size or sequence length to see the maximum sequence length or batch size that can be used with the model on the selected device. If both batch size and sequence length are specified, the chart will show the total *memory usage* of the model on the selected device.

## Support

For support or any bugs and errors, please do not hesitate to contact Titan Takeoff team at [hello@titanml.co](mailto:hello@titanml.co).
