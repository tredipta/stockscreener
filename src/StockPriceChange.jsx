import React, { useEffect, useState } from "react";
import axios from "axios";
import Chart from "react-apexcharts"; // Import ApexCharts
import dayjs from "dayjs";
import {
  TextField,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
} from "@mui/material";

const StockPriceChange = () => {
  const [dailyChanges, setDailyChanges] = useState([]);
  const [symbol, setSymbol] = useState("ITC.NS"); // Default symbol
  const [inputSymbol, setInputSymbol] = useState(""); // For user input
  const [error, setError] = useState("");
  const [metaData, setMetaData] = useState({}); // State to hold metadata
  const [loading, setLoading] = useState(false); // State for loading
  const [chartData, setChartData] = useState([]); // State for chart data
  const [
    multipleGreenCandlesWithIncrementExist,
    setMultipleGreenCandlesWithIncrementExist,
  ] = useState(false); // State to hold data
  const [
    multipleGreenCandlesWithIncrement,
    setMultipleGreenCandlesWithIncrement,
  ] = useState([]);

  const parseDate = (dateString) => {
    const [day, month, year] = dateString.split("-");
    return new Date(`${year}-${month}-${day}`);
  };

  const fetchStockData = async (stockSymbol) => {
    const apiKey = "d01e7caf51msh1f085457b6c5ba9p1e83b4jsnb16304d33860"; // RapidAPI key
    const url =
      "https://yahoo-finance15.p.rapidapi.com/api/v1/markets/stock/history";
    const options = {
      method: "GET",
      url: url,
      params: {
        symbol: stockSymbol,
        diffandsplits: false,
        interval: "1d",
      },
      headers: {
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": "yahoo-finance15.p.rapidapi.com",
      },
    };

    try {
      setLoading(true); // Start loading
      const response = await axios.request(options);
      const data = response.data;

      if (data.body) {
        const body = data.body;
        const changes = [];
        const chartData = [];

        for (const key in body) {
          const dailyData = body[key];
          const openPrice = parseFloat(dailyData.open);
          const highPrice = parseFloat(dailyData.high);
          const lowPrice = parseFloat(dailyData.low);
          const closePrice = parseFloat(dailyData.close);

          chartData.push({
            x: parseDate(body[key].date),
            y: [openPrice, highPrice, lowPrice, closePrice],
          });

          const dailyChange = closePrice - openPrice;
          changes.push({
            date: dailyData.date,
            open: openPrice,
            close: closePrice,
            high: highPrice,
            low: lowPrice,
            change: dailyChange,
          });
        }

        const candles = Object.keys(body).map((key) => ({
          open: parseFloat(body[key].open),
          close: parseFloat(body[key].close),
          high: parseFloat(body[key].high),
          low: parseFloat(body[key].low),
          date: parseDate(body[key].date),
        }));

        const result = hasMultipleGreenCandlesWithIncrement(candles);
        setMultipleGreenCandlesWithIncrementExist(result.length > 0);
        setChartData(chartData);
        await setDailyChanges(changes);
        setMetaData(data.meta);
        setError("");
      } else {
        setError(
          "Error fetching time series data. Please check the stock symbol."
        );
        setDailyChanges([]);
        setMetaData({});
      }
    } catch (error) {
      setError("Error fetching data. Please try again later.");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  function hasMultipleGreenCandlesWithIncrement(candles) {
    const resultCandles = [];
    let tempCandles = [];

    candles.forEach((currentCandle) => {
      if (currentCandle.close > currentCandle.open) {
        if (
          tempCandles.length > 0 &&
          currentCandle.high > tempCandles[tempCandles.length - 1].high
        ) {
          tempCandles.push(currentCandle);
        } else {
          tempCandles = [currentCandle];
        }

        if (tempCandles.length > 1) {
          const percentageIncrease =
            ((tempCandles[tempCandles.length - 1].high - tempCandles[0].low) /
              tempCandles[0].low) *
            100;
          if (percentageIncrease > 18) {
            resultCandles.push([...tempCandles]);
          }
        }
      } else {
        tempCandles = [];
      }
    });

    setMultipleGreenCandlesWithIncrement(resultCandles);
    return resultCandles;
  }

  const buildAnnotations = () => {
    const annotations = [];

    for (let i = 0; i < multipleGreenCandlesWithIncrement.length; i++) {
      for (let j = 0; j < multipleGreenCandlesWithIncrement[i].length; j++) {
        annotations.push({
          x: multipleGreenCandlesWithIncrement[i][j].date.getTime(),
          borderColor: "#00E396",
          label: {
            borderColor: "#00E396",
            style: {
              fontSize: "12px",
              color: "#fff",
              background: "#00E396",
            },
            orientation: "vertical",
            offsetY: j * 20,
            text: `${dayjs(multipleGreenCandlesWithIncrement[i][j].date).format(
              "DD MMM YYYY HH:mm"
            )}`,
          },
        });
      }
    }

    return annotations;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputSymbol) {
      fetchStockData(inputSymbol.toUpperCase() + ".NS");
      setSymbol(inputSymbol);
      setInputSymbol("");
    }
  };

  const chartOptions = {
    chart: {
      type: "candlestick",
      height: 350,
    },
    title: {
      text: `Candlestick Chart for ${symbol}`,
      align: "left",
    },
    annotations: {
      xaxis: buildAnnotations(),
    },
    xaxis: {
      type: "datetime",
      labels: {
        formatter: function (val) {
          return dayjs(val).format("DD MMM YYYY HH:mm");
        },
      },
    },
    yaxis: {
      tooltip: {
        enabled: true,
      },
    },
  };

  return (
    <Paper elevation={3} style={{ padding: "20px" }}>
      <Typography variant="h4" gutterBottom>
        Daily Stock Price Changes
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Enter stock symbol (e.g., ITC.NS)"
          value={inputSymbol}
          onChange={(e) => setInputSymbol(e.target.value)}
          variant="outlined"
          style={{ marginRight: "10px" }}
        />
        <Button variant="contained" type="submit">
          Get Stock Data
        </Button>
      </form>
      {error && <Typography color="error">{error}</Typography>}
      <Typography variant="h5" gutterBottom>
        Stock Information for {symbol}
      </Typography>
      {metaData && (
        <div>
          <Typography>
            <strong>Symbol:</strong> {metaData.symbol}
          </Typography>
          <Typography>
            <strong>Long Name:</strong> {metaData.longName}
          </Typography>
          <Typography>
            <strong>Regular Market Price:</strong> {metaData.regularMarketPrice}
          </Typography>
          <Typography>
            <strong>52-Week High:</strong> {metaData.fiftyTwoWeekHigh}
          </Typography>
          <Typography>
            <strong>52-Week Low:</strong> {metaData.fiftyTwoWeekLow}
          </Typography>
          <Typography>
            <strong>Multiple Green Candles With Increment Present:</strong>
            {multipleGreenCandlesWithIncrementExist ? " Yes" : " No"}
          </Typography>
          <Typography variant="h6">
            Multiple Green Candles With Increment:
          </Typography>
          <div>
            {multipleGreenCandlesWithIncrement.map((candles, listIndex) => (
              <div key={listIndex}>
                <ul>
                  {candles.map((candle, index) => (
                    <li key={index}>
                      Date: {dayjs(candle.date).format("DD MMM YYYY HH:mm")},
                      Open: {candle.open}, Close: {candle.close}, High:{" "}
                      {candle.high}, Low: {candle.low}, Change:{" "}
                      {index > 0
                        ? (
                            ((candles[index].high - candles[0].low) /
                              candles[0].low) *
                            100
                          ).toFixed(2) + "%"
                        : "0%"}
                      ,
                      {/* Opportunity:{" "}
                      {index === 0 &&
                      getDataBetweenDates(
                        candles[0].date.toISOString().split("T")[0],
                        new Date().toISOString().split("T")[0],
                        candles[0].low
                      )
                        ? "No"
                        : "Yes"} */}
                    </li>
                  ))}
                </ul>
                <hr />
              </div>
            ))}
          </div>
        </div>
      )}
      <Typography variant="h5" gutterBottom>
        Daily Changes for {symbol}
      </Typography>
      {loading ? (
        <CircularProgress /> // Show loading spinner
      ) : (
        <>
          <Chart
            options={chartOptions}
            series={[{ data: chartData }]} // Series for candlestick data
            type="candlestick"
            height={350}
          />
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Open</TableCell>
                  <TableCell>Close</TableCell>
                  <TableCell>High</TableCell>
                  <TableCell>Low</TableCell>
                  <TableCell>Daily Change</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dailyChanges.map((change, index) => (
                  <TableRow key={index}>
                    <TableCell>{change.date}</TableCell>
                    <TableCell>{change.open.toFixed(2)}</TableCell>
                    <TableCell>{change.close.toFixed(2)}</TableCell>
                    <TableCell>{change.high.toFixed(2)}</TableCell>
                    <TableCell>{change.low.toFixed(2)}</TableCell>
                    <TableCell
                      style={{
                        background:
                          change.change.toFixed(2) > 0 ? "green" : "red",
                        color: "#fff",
                        borderRadius: "20px",
                      }}
                    >
                      {change.change.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Paper>
  );
};

export default StockPriceChange;
