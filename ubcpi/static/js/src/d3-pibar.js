d3.custom = (d3.custom || {});

/**
 * Data format:
 * [
 *     {frequency: 20, label: 'Option 1', class: 'ubcpibar'},
 *     {frequency: 50, label: 'Option 2', class: 'ubcpibar'},
 *     {frequency: 5,  label: 'Option 3 (correct)', class: 'ubcpibar correct-answer'},
 *     {frequency: 45, label: 'Option 4', class: 'ubcpibar'},
 *     {frequency: 0,  label: 'Option 5', class: 'ubcpibar'},
 * ]
 */
d3.custom.barChart = function(scope, gettext) {
    // Private Variables
    var chartWidth  = 750;
    var chartHeight = 250;
    var minTotalFrequency = 10;

    if(scope.role == 'instructor' || scope.role == 'staff'){ minTotalFrequency = 1}

    function chart(selection) {
        selection.each(function(data) {
            var totalFreq = d3.sum(data, function(d) { return d.frequency; });

            // Layout
            var margin = {
                top: 10,
                right: 0,
                bottom: 30,
                left: 0
            };

            if (totalFreq < minTotalFrequency) {
                d3.select(this)
                    .append("span")
                    .text(gettext("Not enough data to generate the chart. Please check back later."));
                return;
            }

            var width = chartWidth - margin.left - margin.right;
            var height = chartHeight - margin.top - margin.bottom;

            var svg = d3.select(this)
                .classed("svg-container", true)
                .append("svg")
                .attr("preserveAspectRatio", "xMaxYMax meet")
                .attr("viewBox", "0 0 800 250")
                .classed("svg-content-responsive", true);

            var x = d3.scale.ordinal()
                .rangeRoundBands([0, width], 0.1);

            var y = d3.scale.linear()
                .range([height, 0]);

            var xAxis = d3.svg.axis()
                .scale(x)
                .orient("bottom");

            var yAxis = d3.svg.axis()
                .scale(y)
                .orient("left")
                .ticks(10, "%");

            x.domain(data.map(function (d) {
                return d.label;
            }));
            y.domain([0, d3.max(data, function (d) {
                return d.frequency;
            })]);

            svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .style("font-style", function(d) { return "italic";})
                .call(xAxis);

            svg.append("g")
                .attr("class", "y axis")
                .call(yAxis)
                .append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 6)
                .attr("dy", ".71em")
                .style("text-anchor", "end");

            var bars = svg.selectAll(".ubcpibar")
                .data(data)
                .enter()
                .append("g");

            bars.append("rect").attr("class", function (d, i) {
                return d.class;
            })
                .attr("x", function (d) {
                    return x(d.label);
                })
                .attr("width", x.rangeBand())
                .attr("y", function (d) {
                    return y(d.frequency);
                })
                .attr("height", function (d) {
                    return height - y(d.frequency);
                });

            bars.append("text")
                .attr("x", function (d) {
                    return x(d.label);
                })
                .attr("y", function (d) {
                    return y(d.frequency);
                })
                .attr("dy", function (d) {

                    // If the frequency is 0, we have to adjust style slightly
                    if (d.frequency == 0) {
                        return "-0.5em";
                    }

                    return "1.25em";

                })
                .attr("dx", (x.rangeBand() / 2) - 25 + "px")
                .text(function (d) {
                    var percentage = (d.frequency / totalFreq) * 100;
                    var rounded = Math.round(percentage * 10) / 10;
                    return rounded.toFixed(1) + '%';
                })
                .style("font-weight", function(d) { return "bold";});
        });

    }

    // Public Variables/ (Getters and Setters)
    chart.width = function(width) {
        if (!arguments.length) return chartWidth;
        chartWidth = width;

        return this;
    };

    chart.height = function(height) {
        if (!arguments.length) return chartHeight;
        chartHeight = height;

        return this;
    };

    chart.minTotalFrequency = function(min) {
        if (!arguments.length) return minTotalFrequency;
        minTotalFrequency = min;

        return this;
    };

    return chart;
};

