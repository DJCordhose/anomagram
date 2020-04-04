/**
 * @license
 * Copyright 2019 Victor Dibia. https://github.com/victordibia
 * Anomagram - Anomagram: Anomaly Detection with Autoencoders in the Browser.
 * Licensed under the MIT License (the "License"); 
 * =============================================================================
 */

 
import React, { Component } from "react";
import {Loading,Dropdown, Slider, Checkbox, Tooltip } from "carbon-components-react"
import "./train.css"
import * as tf from '@tensorflow/tfjs';
import {registerGAEvent, computeAccuracyGivenThreshold, percentToRGB } from "../helperfunctions/HelperFunctions"
import ROCChart from "../rocchart/ROCChart"
// custom charts 
import HistogramChart from "../histogram/HistogramChart"
import ScatterPlot from "../ScatterPlot/ScatterPlot"
import LossChart from "../losschart/LossChart"
import ComposeModel from "../composemodel/ComposeModel"

import { Reset16, PlayFilledAlt16, PauseFilled16 } from '@carbon/icons-react';
import { buildModel } from "./models/ae"
import * as _ from "lodash"


class Train extends Component {

    constructor(props) {
        super(props) 

        this.chartWidth = 350;
        this.chartHeight = 250;

        

        // Model update method passed to model composer component
        this.updateModelDims = this.updateModelDims.bind(this)

        this.stepOptions = [{ id: "opt4", text: "30", value: 30, type: "steps" },{ id: "opt1", text: "50", value: 50, type: "steps" }, { id: "opt2", text: "100", value: 100, type: "steps" }]
        this.regularizerOptions = [{ id: "opt1", text: "None", value: "none", type: "regularizer" }, { id: "opt1", text: "l1", value: "l1", type: "regularizer" }, { id: "opt2", text: "l2", value: "l2", type: "regularizer" }, { id: "opt2", text: "l1l2", value: "l1l2", type: "regularizer" }]
        this.batchSizeOptions = [{ id: "opt1", text: "64", value: 64, type: "batchsize" }, { id: "opt2", text: "128", value: 128, type: "batchsize" }, { id: "opt3", text: "256", value: 256, type: "batchsize" }, { id: "opt3", text: "512", value: 512, type: "batchsize" }, { id: "opt3", text: "1024", value: 1024, type: "batchsize" }]
        this.learningRateOptions = [{ id: "opt1", text: "0.01", value: 0.01, type: "learningrate" }, { id: "opt2", text: "0.001", value: 0.001, type: "learningrate" }, { id: "opt3", text: "0.0001", value: 0.0001, type: "learningrate" },{ id: "opt5", text: "0.1", value: 0.1, type: "learningrate" },{ id: "opt6", text: "1", value: 1, type: "learningrate" },{ id: "opt7", text: "10", value: 10, type: "learningrate" }]
        // this.regularizationRateOptions = [ 
        //     { id: "opt3", text: "0.01", value: 0.01, type: "regularizationrate" },
        //     { id: "opt1", text: "0.001", value: 0.001, type: "regularizationrate" },
        //     { id: "opt2", text: "0.0001", value: 0.0001, type: "regularizationrate" }, 
        // ]
        this.trainingDataOptions = [{ id: "opt1", text: "500", value: 500, type: "traindatasize" }, { id: "opt2", text: "1000", value: 1000, type: "traindatasize" }, { id: "opt3", text: "2500", value: 2500, type: "traindatasize" }]
        this.testDataOptions = [{ id: "opt1", text: "100", value: 100, type: "testdatasize" }, { id: "opt2", text: "200", value: 200, type: "testdatasize" }, { id: "opt3", text: "500", value: 500, type: "testdatasize" }]
        this.optimizerOptions = [
            { id: "opt1", text: "Adam", value: "adam", type: "optimizer" },
            { id: "opt3", text: "Adamax", value: "adamax", type: "optimizer" },
            { id: "opt4", text: "Adadelta", value: "adadelta", type: "optimizer" },
            { id: "opt5", text: "Rmsprop", value: "rmsprop", type: "optimizer" },
            { id: "opt6", text: "Momentum", value: "momentum", type: "optimizer" },
            { id: "opt7", text: "sgd", value: "sgd", type: "optimizer" },
        ]
        this.abnormalPercentageOptions = [
            { id: "opt1", text: "0%", value: 0, type: "abnormalpercentage" },
            { id: "opt3", text: "5%", value: 0.05, type: "abnormalpercentage" },
            { id: "opt4", text: "10%", value: 0.1, type: "abnormalpercentage" },
            { id: "opt5", text: "20%", value: 0.2, type: "abnormalpercentage" },
            { id: "opt2", text: "30%", value: 0.3, type: "abnormalpercentage" },
            { id: "opt9", text: "40%", value: 0.4, type: "abnormalpercentage" },
            { id: "opt6", text: "50%", value: 0.5, type: "abnormalpercentage" },
            { id: "opt7", text: "70%", value: 0.7, type: "abnormalpercentage" },
        ]
 

        this.selectedAbnormalPercentage = 0
        this.selectedTrainDataOption = 0
        this.selectedTestDataOption = 2
        this.selectedOptimizer = 0

        this.selectedRegularizer = 0

        this.trainMetricHolder = []
        this.CumulativeSteps = 0;

        this.interfaceTimedDelay=  700

        this.state = {
            apptitle: "Anomagram",
            isTraining: false, 
            trainLoaded: false,
            testLoaded: false,
            trainDataShape: [0, 0],
            testDataShape: [0, 0],
            mseData: [],
            rocData: [],
            createdModel: null,
            encodedData: [],
            selectedData: 0,

            currentEpoch: 0,
            numFeatures: 140,
            hiddenLayers: 2,
            latentDim: 2,
            hiddenDim: [7, 3],
            learningRate: this.learningRateOptions[0].value,
            regularizer: this.regularizerOptions[this.selectedRegularizer].value,
            adamBeta1: 0.5,
            optimizer: this.optimizerOptions[this.selectedOptimizer].value,
            outputActivation: "sigmoid",
            batchSize: this.batchSizeOptions[3].value,
            numSteps: this.stepOptions[0].value,
            numEpochs: 1,


            trainMetrics: this.trainMetricHolder,
            CumulativeSteps: 0,
            trainDataSize: this.trainingDataOptions[this.selectedTrainDataOption].value,
            testDataSize: this.testDataOptions[this.selectedTestDataOption].value,

            modelStale: true,
            bestMetric: { acc: 0, fpr: 0, fnr: 0, tnr: 0, tpr: 0, threshold: 0, precision:0, recall:0 },
            minThreshold: 0,
            maxThreshold: 1,


            showModelComposer: true,
            showModelEvaluationMetrics: true,
            showRocChart: true,
            showLossChart: true,
            showMseHistogram: true,
            showBottleneckScatterPlot: true,


            validateOnStep: true,
            auc: 0,


            showAdvanced: true,
            showIntroduction: true,
            showWarmingUp: true,

            
            lossChartHeight: this.chartHeight,
            lossChartWidth: this.chartWidth,
            abnormalPercentage: this.abnormalPercentageOptions[this.selectedAbnormalPercentage].value,

            floatCapable: false,
            floatEnabled: false,
            isCreating: false,
            showError: false,
            errorMsg: "An error has occured."
 
        }

        this.showOptions = [
            { label: "Model Composer", action: "composer", checked: this.state.showModelComposer },
            { label: "Model Metrics", action: "evaluation", checked: this.state.showModelEvaluationMetrics }, { label: "Training Loss", action: "loss", checked: this.state.showLossChart },
            { label: "Error Histogram", action: "histogram", checked: this.state.showMseHistogram },
            { label: "ROC Curve", action: "roc", checked: this.state.showRocChart },
            { label: "Bottleneck Plot", action: "bottleneck", checked: this.state.showBottleneckScatterPlot },

        ]


        this.currentSteps = 0;

        this.xsTrain = []
        this.xsTest = []
        this.yTest = []

        this.trainDataPath = process.env.PUBLIC_URL + "/data/ecg/train_scaled.json"
        this.testDataPath = process.env.PUBLIC_URL + "/data/ecg/test_scaled.json" 
        this.momentum = 0.9 

        this.modelWarmedUp = false;
        this.tensorsCreated = false;

        this.trainUnmounted = false

       
    }

    componentDidMount() { 

        this.getChartContainerSizes() 
        this.componentLoadedTime = (new Date()).getTime()



        // load test and train data
        this.fetchData(this.trainDataPath).then((trainData) => {  
                this.trainData = trainData
                this.setState({trainLoaded: true}) 
           
        }).catch((error) => {
            this.handleDataLoadError()
            
        });
        
        this.fetchData(this.testDataPath).then((testData) => {  
                this.testData = testData
                this.setState({testLoaded: true})
            
        }).catch((error) => {
            this.handleDataLoadError()
            
        });

    }

    handleDataLoadError() {
        // console.log("Failed to test data");
        this.setState({showError:true, errorMsg: "Error fetching data. Please check internet connection and reload page. "}) 
    }

    fetchData(dataPath) {
        return fetch(dataPath)
            .catch(() => {
               
           })
            .then((response) => {
                return response.json()
            
        })  
    }

    componentDidUpdate(prevProps, prevState) {
        if ((prevState.isTraining !== this.state.isTraining) && this.state.isTraining === false) {
             
        }

        if (this.currentSteps === 0 && prevState.mseData[0] !== this.state.mseData[0]) { 
            this.computeAccuracyMetrics(this.state.mseData)
        }

        if (this.state.CumulativeSteps !== prevState.CumulativeSteps) { 
            this.computeAccuracyMetrics(this.state.mseData)
        }

        // if train or test size updated, regenerate tensors
        if (this.state.trainDataSize !== prevState.trainDataSize || this.state.testDataSize !== prevState.testDataSize || this.state.abnormalPercentage !== prevState.abnormalPercentage ) {
            this.generateDataTensors()
        }
    }


    destroyModelTensors() {
        // Dispose all tensors used to hold model parameters
        if (this.createdModel) {
            // this.encoder.dispose()
            this.createdModel.dispose()
            this.optimizer.dispose() 
        }
    }

    componentWillUnmount() {
        this.trainUnmounted = true
        if (this.tensorsCreated) {
            this.xsTest.dispose()
            this.xsTrain.dispose() 
            this.destroyModelTensors()
        }
         
        // this.xsWarmup.dispose()
        // console.log(tf.memory()); 
    }
    createModel() { 

        // dispose of existing model to release tensors from memory
        this.destroyModelTensors()

        // if Data tensors not created at all, create tensors 
        if (!this.tensorsCreated) {
            this.generateDataTensors()
            this.tensorsCreated = true
        } 

        //construct model
        switch (this.state.optimizer) {
            case "adam":
                this.optimizer = tf.train.adam(this.state.learningRate, this.state.adamBeta1)
                break
            case "adamax":
                this.optimizer = tf.train.adamax(this.state.learningRate, this.state.adamBeta1)
                break
            case "adadelta":
                this.optimizer = tf.train.adadelta(this.state.learningRate)
                break
            case "rmsprop":
                this.optimizer = tf.train.rmsprop(this.state.learningRate)
                break
            case "momentum":
                this.optimizer = tf.train.momentum(this.state.learningRate, this.momentum)
                break
            case "sgd":
                this.optimizer = tf.train.sgd(this.state.learningRate)
                break
            default:
                break;
        }



        let modelParams = {
            numFeatures: this.state.numFeatures,
            hiddenLayers: this.state.hiddenLayers,
            latentDim: this.state.latentDim,
            hiddenDim: this.state.hiddenDim,
            optimizer: this.optimizer,
            outputActivation: "sigmoid",
            regularizer: this.state.regularizer,
            regularizationRate: this.state.learningRate
        }

        this.createdModel = buildModel(modelParams)
        this.setState({ modelStale: false, isCreating:false })
        this.getPredictions()

        
        


        // this.createdModel.summary()

        // setTimeout(() => {
        // this.modelWarmUp()
        // }, 5000);

        // showToast("success", "Model successfully created")
        // console.log(tf.memory());
        // this.setState({showWarmingUp: false})
    }

    warmUpModel() {

        // let warmUpTensor = tf.tensor2d(this.trainData[0].data,[1,140])
         console.log("attempting warmup");
         
        let warmUpTensor =  tf.tensor2d(this.trainData.slice(0,10).map(item => item.data
            ), [10, this.trainData[0].data.length])
        this.setState({ trainDataShape: this.xsTrain.shape })
        
        let startTime = new Date();
        this.createdModel.fit(warmUpTensor, warmUpTensor, { epochs: 1, verbose: 0, batchSize: 512}
        ).then(res => {
            let endTime = new Date();
            let elapsedTime = (endTime - startTime) / 1000
            console.log("Warmup done", elapsedTime);
        });

    }

    // will be called recursively as long as we are in training mode
    async trainModel() {
        this.currentSteps++;
        this.CumulativeSteps++;
        this.setState({ CumulativeSteps: this.CumulativeSteps });

        let startTime = new Date();
        // we train for just one epoch
        const res = await this.createdModel.fit(this.xsTrain,
            this.xsTrain, { epochs: this.state.numEpochs, verbose: 0, batchSize: this.state.batchSize, validationData: [this.xsTest, this.xsTest] }
        );
        let endTime = new Date();
        let elapsedTime = (endTime - startTime) / 1000

        // update metrics
        let metricRow = { epoch: this.CumulativeSteps, loss: res.history.loss[0], val_loss: res.history.val_loss[0], traintime: elapsedTime }
        this.trainMetricHolder.push(metricRow)

        // continue training if we did not pause and there are still steps left
        if (this.state.numSteps > this.currentSteps && this.state.isTraining && !this.trainUnmounted  && (!this.state.modelStale)) {
            // get and display predictions
            this.getPredictions();
            this.setState({ currentEpoch: this.currentSteps })
            // recurse
            this.trainModel()
        } else {
            this.currentSteps = 0
            this.setState({ isTraining: false })
        }
    }

    async loadSavedModel() {
        // TODO .. launch loadning spinnr
        let modelPath = "/webmodel/ecg/model.json"
        this.savedModel = await tf.loadLayersModel(modelPath);
        console.log("model loaded");
        this.loadTestData()

    }


    computeAccuracyMetrics(data) {

        let uniqueMse = _.uniq(_.map(data, 'mse'))

        uniqueMse = _(uniqueMse).sortBy().value()
        uniqueMse.reverse()




        let rocMetricHolder = []
        let rocSum = 0
        let prevMetric = { fpr: 0, tpr: 0 }

        uniqueMse.forEach((each, i) => {
            let metric = computeAccuracyGivenThreshold(data, each)

            rocMetricHolder.push(metric)
            // if (i < uniqueMse.length) {
            // rocSum += (prevMetric.tpr) * (metric.fpr - prevMetric.fpr)
            rocSum += ((prevMetric.tpr + metric.tpr) / 2) * (metric.fpr - prevMetric.fpr)
            // console.log(i, rocSum);
            // }
            prevMetric = metric

        });

        // Add point (1,1) to compute AUC
        // use trapezium area rule to calculate area
        if (prevMetric.fpr !== 1) {
            rocMetricHolder.push({ fpr: 1, tpr: prevMetric.tpr })
            rocSum += ((prevMetric.tpr + 1) / 2) * (1 - prevMetric.fpr)
            // rocSum += prevMetric.tpr * (1 - prevMetric.fpr)
        }


        // console.log(rocSum, " Region under curve");
        // console.log(rocMetricHolder);


        this.setState({ rocData: rocMetricHolder })
        this.setState({ auc: rocSum })
        // console.log("mse initial", _.min(uniqueMse), _.max(uniqueMse));

        let bestMetric = _.maxBy(rocMetricHolder, "acc")
        this.setState({ bestMetric: bestMetric })
        this.setState({ minThreshold: _.min(uniqueMse) })
        this.setState({ maxThreshold: _.max(uniqueMse) })

        
    }


    getPredictions() {
        let self = this;

        // Get predictions 
        // let startTime = new Date()
        let preds = this.createdModel.predict(this.xsTest, { batchSize: this.state.batchSize })
        // let elapsedTime = (new Date() - startTime) / 1000
        // console.log("prediction time", elapsedTime);


        //With large batchsize - 0.001, defualt batchsize .. 0.015
        // Compute mean squared error difference between predictions and ground truth
        const mse = tf.tidy(() => {
            return tf.sub(preds, this.xsTest).square().mean(1)
        })
        // let mse = tf.sub(preds, this.xsTest).square().mean(1) //tf.losses.meanSquaredError(preds, xsTest)
        let mseDataHolder = []
        mse.array().then(array => {
            array.forEach((element, i) => {
                // console.log({ "mse": element, "label": yTest[i] });
                mseDataHolder.push({ "mse": element, "label": this.yTest[i] })
                // console.log(mseDataHolder.length)
            });
            self.setState({ mseData: mseDataHolder })

            // console.log(mseDataHolder); 

        });



        // Generate encoder output 
        this.encoder = tf.model({ inputs: this.createdModel.inputs, outputs: this.createdModel.getLayer("encoder").getOutputAt(1) });
        let encoderPredictions = this.encoder.predict(this.xsTest)


        let encPredHolder = []
        encoderPredictions.array().then(array => {
            array.forEach((element, i) => {
                encPredHolder.push({ x: element[0], y: element[1], "label": this.yTest[i] })
            });
            self.setState({ encodedData: encPredHolder })
        })


        preds.dispose()
        encoderPredictions.dispose()
        mse.dispose()
        // console.log(tf.memory());

        
    }

    updateModelDims(hiddenDims, latentDim) {
        // console.log(hiddenDims, latentDim);
        this.setState({ hiddenDim: hiddenDims })
        this.setState({ latentDim: latentDim[0] })
        this.setState({ modelStale: true })

    }

    // visualizeMSE(mse)
    generateDataTensors() {
        // console.log("Generating data tensor");
        
        //shuffle data
        this.trainData = _.shuffle(this.trainData)
        this.testData = _.shuffle(this.testData)

        let maxAbnormalCount = this.state.abnormalPercentage * this.state.trainDataSize;
        let abnormalCount = 0;

        let trainEcg = []
        //Add abnormal samples
        for (let row in this.trainData) {
            let val = this.trainData[row] 
            if (val.target + "" !== 1 + "") {
                if (abnormalCount < maxAbnormalCount) {
                    trainEcg.push(val)
                    abnormalCount++
                }
            }
        }

        //Add  positive normal ECG (target==1) to train json array 
        for (let row in this.trainData) {
            let val = this.trainData[row]
            if (val.target + "" === 1 + "") { 
                if (trainEcg.length < this.state.trainDataSize) {
                    trainEcg.push(val)
                } else {
                    break
                }
            }  
        }

        // console.log(maxAbnormalCount, "abnormal samples",  abnormalCount, "Total", trainEcg.length);
        

        // Create train tensor from json array
        this.xsTrain = tf.tensor2d(trainEcg.map(item => item.data
        ), [trainEcg.length, trainEcg[0].data.length])
        this.setState({ trainDataShape: this.xsTrain.shape })


        // Create test data TENSOR from test data json array 
        let testData = this.testData.slice(0, this.state.testDataSize)
        this.xsTest = tf.tensor2d(testData.map(item => item.data
        ), [testData.length, testData[0].data.length])

        // Create yLabel Tensor
        this.yTest = testData.map(item => item.target + "" === 1 + "" ? 0 : 1)

        this.setState({ testDataShape: this.xsTest.shape })

    }

    trainButtonClick(e) {
        registerGAEvent("trainmodel", "trainbutton", this.state.isTraining.toString(), this.componentLoadedTime)
        if (this.state.isTraining) {
            this.setState({ isTraining: false })
        } else {
            this.setState({ isTraining: true })
            setTimeout(() => {
                this.trainModel()
            }, this.interfaceTimedDelay);
        }
    }

    resetModelButtonClick(e) { 
        registerGAEvent("trainmodel", "compilebutton",  "compilebutton", this.componentLoadedTime)
        this.CumulativeSteps = 0 
        this.trainMetricHolder = []
        this.setState({
            // showIntroduction: false,
            isCreating: true,
            isTraining: false,
            CumulativeSteps: 0,
            trainMetrics: this.trainMetricHolder 
        })
        
          
       
        // this.setState({ mseData: [] }) 
        setTimeout(() => {
            this.createModel()
        }, this.interfaceTimedDelay);
        
    }

    updateModelParam(e) {
        // model state is set to stale each time a parameter is updated.
        registerGAEvent("trainmodel", "modelparameter",  e.selectedItem.type, this.componentLoadedTime)
        
        this.setState({ modelStale: true })
        switch (e.selectedItem.type) {
            case "steps":
                this.setState({ numSteps: e.selectedItem.value })
                break
            case "batchsize":
                this.setState({ batchSize: e.selectedItem.value }) 
                break
            case "learningrate":
                this.setState({ learningRate: e.selectedItem.value }) 
                break
            case "traindatasize":
                this.setState({ trainDataSize: e.selectedItem.value }) 
                break
            case "abnormalpercentage":
                    this.setState({ abnormalPercentage: e.selectedItem.value }) 
                    break
            case "testdatasize":
                this.setState({ testDataSize: e.selectedItem.value })
                break
            case "optimizer":
                this.setState({ optimizer: e.selectedItem.value }) 
                break
            case "regularizer":
                this.setState({ regularizer: e.selectedItem.value }) 
                break
            default:
                break
        }


    }


    updateThreshold(e) {
        if (this.state.mseData.length > 0) {
            let threshVal = this.state.minThreshold + (e.value / 100) * (this.state.maxThreshold - this.state.minThreshold)
            let bestMetric = computeAccuracyGivenThreshold(this.state.mseData, threshVal)
            // console.log(e.value, this.state.mseData);
            this.setState({ bestMetric: bestMetric })
        }

    }

    

    showOptionsClick(e) {
        // console.log(e.target.checked, e.target.getAttribute("action"));
        registerGAEvent("trainmodel", "selectchart",  e.target.getAttribute("action"), this.componentLoadedTime)
        
        switch (e.target.getAttribute("action")) {
            case "histogram":
                this.setState({ showMseHistogram: e.target.checked })
                break
            case "loss":
                this.setState({ showLossChart: e.target.checked })
                break
            case "composer":
                this.setState({ showModelComposer: e.target.checked })
                break
            case "bottleneck":
                this.setState({ showBottleneckScatterPlot: e.target.checked })
                break
            case "roc":
                this.setState({ showRocChart: e.target.checked })
                break
            case "evaluation":
                this.setState({ showModelEvaluationMetrics: e.target.checked })
                break
            default:
                break
        }

    }

    toggleAdvancedDrawer(e) {
        this.setState({ showAdvanced: !(this.state.showAdvanced) })
    }

    toggleIntroDrawer(e) {
        this.setState({ showIntroduction: !(this.state.showIntroduction) })
    }
 
    getChartContainerSizes() {
        

        this.setState({ lossChartHeight: this.refs["modelevalbox"].offsetHeight-  50 })
        // this.setState({lossChartWidth: this.refs["modelevalbox"].offsetWidth })
         
        
    }

    render() {
        // console.log(this.state.mseData);
        
        
        // Use chart state determine when to redraw model composer lines as UI has change
        let chartState = ""
        this.showOptions.forEach(data => {
            let box = document.getElementById(data.action + "checkboxid")
            if (box !== null) {
                chartState += box.checked 
            } 
        }); 

         

        let showCheckBoxes = this.showOptions.map((data) => {
            return (
                <div key={data.label + "checkbox"} className="mediumdesc iblock mr10">
                    <Checkbox
                        defaultChecked={data.checked}
                        wrapperClassName={"mediumdesc chartchecks"}
                        className={"mediumdesc "}
                        labelText={data.label}
                        id={data.action + "checkboxid"}
                        action={data.action}
                        onClick={this.showOptionsClick.bind(this)}
                    ></Checkbox>
                </div>
            )
        })

        let isDataLoaded = this.state.testLoaded && this.state.trainLoaded 
        let loadingText = (
            <div className=" pb10">
                Loading <span> train </span> <span> and test </span> data ... 
            </div>
        )

        let trainResetButtons = (
            <div>
                <div className="  flex flexjustifycenter pt10 ">

                   

                    <div className="iblock h100 mr5 ">
                        <div className="  flex flexjustifycenter h100  ">
                            <div className="">
                                <div
                                    onClick={this.resetModelButtonClick.bind(this)}
                                    className={" circlesmall circlebutton mr5 flex flexjustifycenter clickable " + (this.state.isTraining || !isDataLoaded ? "  disabled" : "") + " " + (this.state.modelStale ? " pulse" : "")}>
                                    <Reset16 style={{ fill: "white" }} className="unselectable unclickable" />

                                </div>
                                <div className=" displayblock smalldesc textaligncenter pt5 "> Compile  </div>
                            </div>

                        </div>

                    </div>

                    <div className=" iblock ">
                        <div
                            onClick={this.trainButtonClick.bind(this)}
                            className={("iblock circlelarge circlebutton mr5 flexcolumn flex flexjustifycenter clickable ") + (this.state.modelStale || !isDataLoaded ? " disabled" : "")}>
                            {!this.state.isTraining && <PlayFilledAlt16 style={{ fill: "white" }} className="unselectable unclickable" />}
                            {this.state.isTraining && <PauseFilled16 style={{ fill: "white" }} className="unselectable unclickable" />}
                        </div>
                        <div className="smalldesc textaligncenter pt5 pb5 "> Train &nbsp; </div>
                    </div>

                    <div ref className="iblock  mr10">
                        <div ref="activeloaderdiv" className="resetbox" style={{opacity: (this.state.isTraining || this.state.isCreating || !isDataLoaded ) ? 1:0, width: (this.state.isTraining || this.state.isCreating || !isDataLoaded)  ?  "34px": "0px"  }} >
                            <Loading
                                className=" "
                                active={true}
                                small={true}
                                withOverlay={false}
                            > </Loading>
                        </div>

                    </div>



                </div>
            </div>
        )
        let configBar = (
            <div ref="modelconfigbar" style={{ zIndex: 100 }} className={"w100   unselectable greyhighlight  flex flexjustifyleft flexjustifycenter modelconfigbar  " + (!isDataLoaded ? " divdisabled" : "")}>
                <div className="pl10 pt10 pr10 pb5  iblock">
                    <div className="iblock mr10">
                        <div className="mediumdesc pb7 pt5"> Steps <span className="boldtext"> {this.state.numSteps} </span>  - {this.state.CumulativeSteps}  </div>
                        <Dropdown
                            id="epochsdropdown" 
                            label="Steps"
                            items={this.stepOptions}
                            initialSelectedItem={this.stepOptions[0]}
                            itemToString={item => (item ? item.text : "")}
                            onChange={this.updateModelParam.bind(this)}
                        />
                    </div>

                    <div className="iblock mr10">
                        <div className="mediumdesc pb7 pt5"> Batchsize <span className="boldtext"> {this.state.batchSize} </span> </div>
                        <Dropdown
                            id="batchsizedropdown"
                            label="Batch Size"
                            items={this.batchSizeOptions}
                            initialSelectedItem={this.batchSizeOptions[3]}
                            itemToString={item => (item ? item.text : "")}
                            onChange={this.updateModelParam.bind(this)}
                        />
                    </div>

                    <div className="iblock mr10">
                        <div className="mediumdesc pb7 pt5"> Learning Rate <span className="boldtext"> {this.state.learningRate}</span>  </div>
                        <Dropdown
                            id="learningratedropdown"
                            label="Learning Rate"
                            items={this.learningRateOptions}
                            itemToString={item => (item ? item.text : "")}
                            initialSelectedItem={this.learningRateOptions[0]}
                            onChange={this.updateModelParam.bind(this)}
                        />
                    </div>

                    <div className="iblock mr10">
                        <div className="mediumdesc pb7 pt5"> Regularlizer <span className="boldtext"> {this.state.regularizer}</span> </div>
                        <Dropdown
                            id="regularizeerdropdown"
                            label="Regularizer"
                            items={this.regularizerOptions}
                            itemToString={item => (item ? item.text : "")}
                            initialSelectedItem={this.regularizerOptions[this.selectedRegularizer]}
                            onChange={this.updateModelParam.bind(this)}
                        />
                    </div>

                    <div style={{ zIndex: 5000 }} className="iblock mr10 ">
                        <div className="mediumdesc pb7 pt5"> Optimizer <span className="boldtext"> {this.state.optimizer} </span> </div>
                        <Dropdown
                            style={{ zIndex: 100 }}
                            id="optimizerdropdown"
                            label="Optimizer"
                            items={this.optimizerOptions}
                            itemToString={item => (item ? item.text : "")}
                            initialSelectedItem={this.optimizerOptions[this.selectedOptimizer]}
                            onChange={this.updateModelParam.bind(this)}
                        />
                    </div>

                     
                    <div className="iblock mr10 borderleftdash pl10 ">
                    {/* <div className="configsectiontitle smalldesc iblock mr10">  Dataset </div> */}
                        <div className="iblock">
                        <div className="mediumdesc pb7 pt5">Train Size <span className="boldtext"> {this.state.trainDataShape[0]} </span>  </div>
                        <Dropdown
                            id="trainingdatadropdown"
                            label="Training Data"
                            items={this.trainingDataOptions}
                            initialSelectedItem={this.trainingDataOptions[this.selectedTrainDataOption]}
                            itemToString={item => (item ? item.text : "")}
                            onChange={this.updateModelParam.bind(this)}
                        />
                        </div>
                    </div>

                    <div className="iblock mr10">
                        <div className="mediumdesc pb7 pt5"> Abnormal % <span className="boldtext"> {this.state.abnormalPercentage} </span> </div>
                        <Dropdown
                            id="abnormalpercentagedatadropdown"
                            label="Abnormal %"
                            items={this.abnormalPercentageOptions}
                            initialSelectedItem={this.abnormalPercentageOptions[this.selectedAbnormalPercentage]}
                            itemToString={item => (item ? item.text : "")}
                            onChange={this.updateModelParam.bind(this)}
                        />
                    </div>

                    <div className="iblock mr10">
                        <div className="mediumdesc pb7 pt5">Test Size <span className="boldtext"> {this.state.testDataShape[0]} </span> </div>
                        <Dropdown
                            id="testdatadropdown"
                            label="Test Data"
                            items={this.testDataOptions}
                            itemToString={item => (item ? item.text : "")}
                            initialSelectedItem={this.testDataOptions[this.selectedTestDataOption]}
                            onChange={this.updateModelParam.bind(this)}
                        />
                    </div>

                
                    <div className="   pt5 pb3">  
                        {this.state.modelStale && <div className="smallblueball pulse iblock"></div>}
                        {(this.state.modelStale && this.state.CumulativeSteps === 0) && <span className="mediumdesc"> Select model parameters
                        and click <span className="boldtext "> Compile </span> to <span className="">initialize</span> the model.</span>}
                        {(this.state.modelStale && this.state.CumulativeSteps > 0) && <span className="mediumdesc"> Model configuration has changed. Click <span className="boldtext "> Compile </span> to recompile model.</span>}
                    { !this.state.modelStale && <span className="mediumdesc"> Model compiled based on selected parameters. Ready to <span className="boldtext"> train </span>. </span> }
                    </div>
                </div>
            </div>
        )
 
        if (this.state.encodedData[0]) {
            // console.log(this.state.encodedData[0].x);
            this.firstEncode = this.state.encodedData[0].x + this.state.encodedData[1].x
        }
        let compBoxSize = 0
        if (this.refs["composemodelbox"]) {
            compBoxSize = this.refs["composemodelbox"].offsetWidth
        }
        // console.log(compBoxSize);
        
        let modelComposerBlock = (
            <div className="composermaindiv">
                 {/* // Model Composer  */}
                {this.state.showModelComposer &&
                        <div className=" mr10 ">
                            <div>
                                <div className="charttitle mb5 ">
                                    Model Composer  
                            </div>
                                <div>
                                    <ComposeModel
                                        hiddenDims={this.state.hiddenDim}
                                        latentDim={[this.state.latentDim]}
                                isTraining={this.state.isTraining}
                                isUpdatable={true}
                                        updateModelDims={this.updateModelDims}
                                        adv={this.state.showAdvanced + "b" + this.state.showIntroduction.toString() + chartState + this.firstEncode + "-" + compBoxSize  +"-"+ isDataLoaded }
                                    />
                                </div>
                            </div>
                        </div>}
            </div>
        )

        let lossChartBlock = (
            <div>
                {this.state.showLossChart && <div className="iblock mr10  h100 " > 
                                    <div>
                                        <div className="charttitle ">
                                            Train Loss
                                        </div>

                        <div>
                        <div className={"positionrelative h100 " + (this.state.trainMetrics.length <= 0 ? " " : "")} style={{ width: this.chartWidth, height: this.chartHeight }}>
                                {this.state.trainMetrics.length <= 0 &&
                                    <div className="notrainingdata">  No training loss data yet </div>
                                }
                                 
                                    {this.state.trainMetrics.length > 0 &&
                                                    <LossChart
                                                        data={{
                                                            data: this.state.trainMetrics,
                                                            chartWidth: this.chartWidth,
                                                            chartHeight: this.state.lossChartHeight,
                                                            epoch: this.state.CumulativeSteps
                                                        }}

                                        ></LossChart>
                                }
                                </div>
                                        </div>
                                    </div> 
                        </div>}
            </div>
        )

        let rocChartBlock = (
            <div>
                {this.state.showRocChart && <div className="iblock mr10">
                            {this.state.rocData.length > 0 &&
                                <div>
                                    <div className="charttitle ">
                                        ROC Curve [ AUC : {this.state.auc.toFixed(2)} ]
                                    </div>

                                    <div>
                                        <ROCChart
                                            data={{
                                                chartWidth: this.chartWidth,
                                                chartHeight: this.state.lossChartHeight,
                                                data: this.state.rocData,
                                                isTraining: this.state.isTraining,
                                                epoch: this.state.CumulativeSteps,
                                                auc: this.state.auc

                                            }} 
                                        ></ROCChart>
                                    </div>
                                </div>
                            }
                        </div>}
            </div>
        )

        let mseHistogramBlock = (
            <div>
                {this.state.showMseHistogram && <div className="iblock mr10 ">
                            {this.state.mseData.length > 0 && 
                                <div>
                                    <div className="charttitle"> Histogram of Mean Square Error </  div>

                                    <div>
                                        <HistogramChart
                                            data={{
                                                data: this.state.mseData,
                                                chartWidth: this.chartWidth,
                                                chartHeight: this.state.lossChartHeight,
                                                epoch: this.state.CumulativeSteps,
                                                threshold: this.state.bestMetric.threshold
                                            }}
                                        ></HistogramChart>
                                    </div>
                                </div> 
                            }
                        </div>}
            </div>
        )

        let bottleneckScatterPlotBlock = (
            <div>
                 {this.state.showBottleneckScatterPlot && <div className="iblock mr10  ">
                            {this.state.encodedData.length > 0 &&

                                <div>
                                    <div className="charttitle"> Bottleneck Scatterplot </  div>

                                    <div>
                                        <ScatterPlot
                                            data={{
                                                data: this.state.encodedData,
                                                chartWidth: this.chartWidth,
                                                chartHeight: this.state.lossChartHeight,
                                                epoch: this.state.CumulativeSteps
                                            }}

                                        ></ScatterPlot>
                                    </div>
                                </div>

                            }
                        </div>}
            </div>
        )

        let modelMetricsBlock = (
            <div className="flex  w100 pr10   "> 
                    {(this.state.bestMetric && this.state.showModelEvaluationMetrics) &&

                        <div className={"iblock perfmetrics w100 " + (this.state.isTraining ? " disabled " : " ")}>
                            <div className="charttitle mb5 ">
                                Model Evaluation Metrics
                            </div>
                            <div className="mb5 greyhighlight p10 touchnoscroll">
                                <Slider
                                    className="w100 border"
                                    min={0} //{(this.state.minThreshold.toFixed(4) * 1)}
                                    max={100}//{(this.state.maxThreshold.toFixed(4) * 1)}
                                    step={2}
                                    minLabel={"%"}
                                    maxLabel={"%"}
                                    value={((this.state.bestMetric.threshold - this.state.minThreshold) / (this.state.maxThreshold - this.state.minThreshold)) * 100}
                                    stepMuliplier={10}
                                    disabled={this.state.isTraining ? true : false}
                                    labelText={"Threshold " + (this.state.bestMetric.threshold).toFixed(4) + " [ " + (((this.state.bestMetric.threshold - this.state.minThreshold) / (this.state.maxThreshold - this.state.minThreshold)) * 100).toFixed(0) + " % ] "}
                                    hideTextInput={true}
                                    onChange={this.updateThreshold.bind(this)}
                                />
                            </div>
                            <div className="flex">
                                <div style={{ borderLeftColor: percentToRGB((this.state.bestMetric.acc * 100)) }} className="metricguage mb5  greyhighlight accuracybox  textaligncenter mr5 flex5" >
                                    <div className="metricvalue textaligncenter  rad4"> {(this.state.bestMetric.acc * 100).toFixed(2)}  %</div>
                                    <div className="metricdesc mediumdesc p5"> Best Accuracy </div>
                                </div>
                                <div style={{ borderLeftColor: percentToRGB((this.state.auc * 100)) }} className="metricguage mb5 greyhighlight  textaligncenter flex5" >
                                    <div className="metricvalue textaligncenter  rad4"> {(this.state.auc).toFixed(2)} </div>
                                    <div className="metricdesc mediumdesc p5"> AUC </div>
                                </div>

                                <div style={{ borderLeftColor: percentToRGB((this.state.bestMetric.precision * 100)) }} className="metricguage mb5 greyhighlight  textaligncenter flex5" >
                                    <div className="metricvalue textaligncenter  rad4"> {(this.state.bestMetric.precision ).toFixed(2)} </div>
                                    <div className="metricdesc mediumdesc p5"> Precision </div>
                        </div>
                        
                        <div style={{ borderLeftColor: percentToRGB((this.state.bestMetric.recall * 100)) }} className="metricguage mb5 greyhighlight  textaligncenter flex5" >
                                    <div className="metricvalue textaligncenter  rad4"> {(this.state.bestMetric.recall).toFixed(2)} </div>
                                    <div className="metricdesc mediumdesc p5"> Recall </div>
                                </div>

                            </div>
                            <div className="mb5 flex">

                                <div style={{ borderLeftColor: percentToRGB(100 - (this.state.bestMetric.fpr * 100)) }} className="metricguage flex5 mr5  greyhighlight  textaligncenter">
                                    <div className="metricvalue textaligncenter"> {(this.state.bestMetric.fpr * 100).toFixed(2)}  % </div>
                                    <div className="metricdesc mediumdesc p5"> False Positive Rate </div>
                                </div>
                                <div style={{ borderLeftColor: percentToRGB(100 - (this.state.bestMetric.fnr * 100)) }} className="metricguage flex5   greyhighlight  textaligncenter">
                                    <div className="metricvalue"> {(this.state.bestMetric.fnr * 100).toFixed(2)} % </div>
                                    <div className="metricdesc displayblock mediumdesc p5"> False Negative Rate </div>
                                </div>

                            </div>
                            <div className="flex">
                                <div style={{ borderLeftColor: percentToRGB((this.state.bestMetric.tpr * 100)) }} className="metricguage flex5  mr5 greyhighlight  textaligncenter">
                                    <div className="metricvalue"> {(this.state.bestMetric.tpr * 100).toFixed(2)} % </div>
                                    <div className="metricdesc mr10 mediumdesc p5"> True Positive Rate </div>
                                </div>
                                <div style={{ borderLeftColor: percentToRGB((this.state.bestMetric.tnr * 100)) }} className="metricguage flex5  greyhighlight  textaligncenter">
                                    <div className="metricvalue"> {(this.state.bestMetric.tnr * 100).toFixed(2)} % </div>
                                    <div className="metricdesc mediumdesc p5"> True Negative Rate </div>
                                </div>
                            </div>

                        </div>}

                </div>
        )
  
        return (
            <div className="maintrainbox">  
                {/* {this.state.showWarmingUp && <div className="">
                    <div className="flex mt10 mr10 ">
                        <div className="iblock  flexjustifycenter" ref="activeloaderdiv" >
                            <div className="loadcircle iblock"></div>
                                
                        </div> 
                       
                        <div className="iblock pt3 pl5 h100 "> Initializing model ...</div> 
                    </div>
                </div>} */}

                {/* show advanced options pannel */}
                <div style={{ zIndex: 100 }} onClick={this.toggleIntroDrawer.bind(this)} className="unselectable mt10 p10 clickable  flex greymoreinfo">
                    <div className="iblock flexfull minwidth485">
                        <strong>
                            {!this.state.showIntroduction && <span>&#x25BC;  </span>} {this.state.showIntroduction && <span>&#x25B2;  </span>}
                        </strong>
                        Introduction
                    </div>
                    <div className="iblock   ">
                        <div className="iblock mr5"> <span className="boldtext"> {} </span></div>
                        <div className="iblock">
                            <div className="smalldesc"> Overview of how it works!</div>
                        </div>
                    </div>

                </div>


                {(this.state.showIntroduction) &&
                    <div className="mynotif h100 lh10 mt10 lightbluehightlight maxh16  mb10">
                        <div className="boldtext"> Train an Autoencoder for Anomaly Detection </div>
                        <div>
                            <a href="https://en.wikipedia.org/wiki/Autoencoder" target="_blank" rel="noopener noreferrer">
                                Autoencoders</a> are neural networks which learn to reconstruct input data. We can leverage this property to detect anomalies.
                                <div className="circlenumber iblock textaligncenter"> 1 </div>  <span className="boldtext"> Compile Model . </span> Select model parameters
                            (number of layers, batchsize, learning rate, regularizer etc) and then click <span className="italics">compile</span> to initialize the model. 
                        
                            <strong className="greycolor"> Hint</strong>: You can add/remove layers and units to 
                            the autoencoder using  the visual model composer + and - buttons. Remember to click <span className="italics">compile</span> after every change!
                        <div className="circlenumber iblock textaligncenter"> 2 </div>  <span className="boldtext"> Train. </span> This trains the autoencoder using normal data 
                        samples from the ECG5000 dataset.  Training the model on a dataset that consists of mainly normal data (an assumption that holds for most anomaly use cases), 
                        the model learns to reconstruct only normal data samples with very little reconstruction error. 
                        To mirror your use case conditions, you can specify the percentage of abnormal samples 
                        to include in the training data set and observe how it affects accuracy.
                        <div className="circlenumber iblock textaligncenter"> 3 </div>  <span className="boldtext"> Evaluate. </span> 
                        At each training step, visualize the reconstruction error (mse) generated for each sample in the test dataset. Observe that mse is higher
                        for abnormal samples compared to abnormal samples. We can select a threshold and flag samples with an mse > threshold as anomalies. 
                        Model performance can then be evaluated using metrics such has AUC, Precision, Recall, TPR, TNR, FPR, FNR ; also observe how these metrics vary with different
                        choices of threshold.
         
                     </div>

                    </div>}

                
                {(this.state.showError && !(this.state.testLoaded && this.state.trainLoaded ))&&
                    <div className="errordiv p10 mb10"> 
                        {this.state.errorMsg}
                    </div>
                }
                {/* show advanced options pannel */}
                <div style={{ zIndex: 100 }} onClick={this.toggleAdvancedDrawer.bind(this)} className="unselectable mt10 p10 clickable  flex greymoreinfo">
                    <div className="iblock flexfull minwidth485">
                        <strong>
                            {!this.state.showAdvanced && <span>&#x25BC;  </span>} {this.state.showAdvanced && <span>&#x25B2;  </span>}
                        </strong>
                        Select model configuration and visualization charts.
                    </div>
                    <div className="iblock   ">
                        <div className="iblock mr5"> <span className="boldtext"> {} </span></div>
                        <div className="iblock">
                            <div className="smalldesc"> 
                                
                                {this.state.hiddenDim.length} Layer Autoencoder
                                
                            </div>
                        </div>
                    </div>

                </div>
                

                {(this.state.showAdvanced) &&
                    <div className=" modelconfigdiv p10 "> 
                        { !isDataLoaded &&  loadingText}

                        <div className="flex flexwrap ">
                            <div className="flexwrapitem">
                                {trainResetButtons}
                            </div>
                            <div className="flexwrapitem flexfull ">
                                {configBar}
                        </div>
                       
                        </div>

                        <div className="pl10 pt5 pr10 pb5 greyborder mt10">
                            <div className="boldtext  iblock mr5">
                                {/* <div className="iblock "> Charts </div> */}
                                <div className="iblock boldtext  ">
                                    <Tooltip
                                        direction="right"
                                        triggerText="Select Charts"
                                    >
                                        <div className="tooltiptext">
                                            Add/Remove charts that visualize the state of the model as training progresses.
                                            For example, the Training Loss chart shows the "loss" or error of the model as training progresses.
                                        </div>

                                    </Tooltip>
                                </div>

                            </div>
                            {showCheckBoxes}
                        </div>

                    </div>
                }
                <div ref="glowbar" className={"glowbar w0 "} style={{ width: Math.floor((this.currentSteps / this.state.numSteps) * 100) + "%" }}></div>
 
                <div ref="chartcontainer" className="flex chartcontainer flexwrap mt10">
                    {this.state.showModelComposer && <div ref="composemodelbox" action="composer"  className={"traincomposerdiv flexwrapitem " + (this.state.showModelComposer ? " flex40":"")}> {modelComposerBlock} </div>}
                    {this.state.showModelEvaluationMetrics &&  <div ref="modelevalbox" action="metrics" className={"flexwrapitem " + (this.state.showModelEvaluationMetrics ? " flexfull":"")}> {modelMetricsBlock} </div>}
                    <div ref="lossbox1" action="loss"  className="  flexwrapitem "> { lossChartBlock} </div>
                    <div action="mse" className="flexwrapitem  "> {mseHistogramBlock} </div>
                    {/* <div className="flex20 flexpushout"></div> */}
                    
                    {(this.state.rocData.length > 0 && this.state.encodedData.length >0) &&
                        <div className="   iblock flex20">
                            <div action="roc" className="flexwrapitem  iblock "> {rocChartBlock} </div>
                            <div action="bottleneck"  className="flexwrapitem   iblock"> {bottleneckScatterPlotBlock} </div>

                         </div>
                    }
                </div>
                
                 
               
                
                {
                     
                    // <div className="mediumdesc p10"> 
                    //    Textures in use - Flaot32 Capable ? {this.state.floatCapable.toString()} | {this.state.floatEnabled.toString()}
                    // </div>
                }
                <br />
                <br />
                <br />

            </div >
        );
    }
}

export default Train;