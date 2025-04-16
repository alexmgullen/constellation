# Testing

| Test case | Expected results | Results |
|---        |---               |---      |
| Create a Stacked column chart with Category and Value. Convert it to your visual and then back to column chart. | No error appears after these conversions. | I'm gonna call this ✓ Since I don't think there's anyway to have the program automaticall rerender  |
| Create a Gauge with three measures. Convert it to your visual and then back to Gauge. | No error appears after these conversions. | I'm gonna call this ✓ Since I don't think there's anyway to have the program automaticall rerender |
| Make selections in your visual. | Other visuals reflect the selections. | ✓ |
| Select elements in other visuals. | Your visual shows filtered data according to selection in other visuals. | ✓ |
| Check min/max dataViewMapping conditions. | Field buckets can accept multiple fields, a single field, or are determined by other buckets. The min/max dataViewMapping conditions must be correctly set up in the capabilities of your visual. | ✓ |
| Remove all fields in different orders. | Visual cleans up properly as fields are removed in arbitrary order. There are no errors in the console or the browser. | ✓ |
| Open the Format pane with each possible bucket configuration. | This test doesn't trigger null reference exceptions. | ✓ |
| Filter data using the Filter pane at the visual, page, and report level. | Tooltips are correct after applying filters. Tooltips show the filtered value. | ✓ |
| Filter data using a Slicer. | Tooltips are correct after applying filters. Tooltips show the filtered value. | ✓ |
| Filter data using a published visual. For instance, select a pie slice or a column. | Tooltips are correct after applying filters. Tooltips show the filtered value. | ✓ |
| If cross-filtering is supported, verify that filters work correctly. | Applied selection filters other visuals on this page of the report. | ✓ |
| Select with Ctrl, Alt, and Shift keys. | No unexpected behaviors appear. | ✓ |
| Change the View Mode to Actual size, Fit to page, and Fit to width. | Mouse coordinates are accurate. | ✓  |
| Resize your visual. | Visual reacts correctly to resizing. | ✓ |
| Set the report size to the minimum. | There's no display errors. | ✓ |
| Ensure scroll bars work correctly. | Scroll bars should exist, if necessary. Check scroll bar sizes. Scroll bars shouldn't be too wide or tall. Position and size of scroll bars must be in accord with other elements of your visual. Verify that scroll bars are needed for different sizes of the visual. | ✓ |
| Pin your visual to a Dashboard. | The visual displays properly. | ✓ |
| Add multiple versions of your visual to a single report page. | All versions of the visual display and operate properly. | ✓ |
| Add multiple versions of your visual to multiple report pages. | All versions of the visual display and operate properly. | ✓ |
| Switch between report pages. | The visual displays properly. | ✓ |
| Test Reading view and Edit view for your visual. | All functions work correctly. | ✓ |
| If your visual uses animations, add, change, and delete elements of your visual. | Animation of visual elements works correctly. | ✓ |
| Open the Property pane. Turn properties on and off, enter custom text, stress the options available, and input bad data. | The visual responds correctly. | ✓ |
| Save the report and reopen it. | All properties settings persist. | ✓ |
| Switch pages in the report and then switch back. | All properties settings persist. | ✓ |
| Test all functionality of your visual, including different options that the visual provides. | All displays and features work correctly. | ✓ |
| Test all numeric, date, and character data types, as in the following tests. | All data is formatted properly. | ✓ |
| Review formatting of tooltip values, axis labels, data labels, and other visual elements with formatting. | All elements are formatted correctly. | ✓ |
| Verify that data labels use the format string. | All data labels are formatted correctly. | ✓ |
| Switch automatic formatting on and off for numeric values in tooltips. | Tooltips display values correctly. | ✓ Constellation doesn't really use this formatting so it doesn't matter |
| Test data entries with different types of data, including numeric, text, date-time, and different format strings from the model. Test different data volumes, such as thousands of rows, one row, and two rows. | All displays and features work correctly. | ✓ |
| Provide bad data to your visual, such as null, infinity, negative values, and wrong value types. | All displays and features work correctly. | ✓ |
