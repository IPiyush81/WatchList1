"use client"

import axios, { AxiosResponse } from "axios";
import Image from "next/image";

import React, { useCallback, useContext, useEffect, useState } from "react";
import { Autocomplete } from "@mui/material";
import Recommendations from "../../components/Recommendations";
import { useRouter } from "next/navigation";
import TextField, { TextFieldProps } from "@mui/material/TextField";

import EmptyIcon from "@mui/icons-material/StarBorder";
const EmptyIconComponent = <EmptyIcon />;

import FullIcon from "@mui/icons-material/Grade";
const FullIconComponent = <FullIcon />;

import HalfIcon from "@mui/icons-material/StarHalf";
const HalfIconComponent = <HalfIcon />;

import IWatchList from "../../interfaces/IWatchList";
import IWatchListItem from "../../interfaces/IWatchListItem";
import IWatchListSource from "../../interfaces/IWatchListSource";

import "../../page.css";

import { DataContext, DataContextType } from "../../data-context";

// I have a very specific use case here where I'm using a custom type that only has these 2 properties so the interface is created here
interface AutoCompleteWatchListItem {
     WatchListItemID: number; // Adjust the type as necessary (e.g., string, number)
     WatchListItemName: string;
}

export default function WatchListDetail() {
     const {
          BrokenImageIconComponent,
          CancelIconComponent,
          darkMode,
          demoMode,
          EditIconComponent,
          isAdding,
          isEditing,
          ratingMax,
          recommendationsEnabled,
          SaveIconComponent,
          setIsAdding,
          setIsEditing,
          setIsError,
          setErrorMessage,
          setWatchListLoadingStarted,
          setWatchListLoadingComplete,
          setWatchListSortingComplete,
          showSearch,
          watchListItems,
          watchListSortDirection,
          watchListSources
     } = useContext(DataContext) as DataContextType

     const currentDate = new Date().toLocaleDateString();

     const [addModified, setAddModified] = useState(false);
     const [addWatchListDtl, setAddWatchListDtl] = useState<IWatchList | null>(null);
     const [autoComplete, setAutoComplete] = useState<IAutoCompleteOption | null>(null);
     const [formattedNames, setFormattedNames] = useState<IAutoCompleteOption[]>([]);
     const [formattedNamesWithId, setFormattedNamesWithId] = useState<AutoCompleteWatchListItem[]>([]);
     const [editModified, setEditModified] = useState(false);
     const [originalWatchListDtl, setOriginalWatchListDtl] = useState<IWatchList | null>(null); (null);
     const [recommendationsVisible, setRecommendationsVisible] = useState(false);
     const [recommendationName, setRecommendationName] = useState<string>("");
     const [recommendationType, setRecommendationType] = useState<string>("");
     const [watchListDtl, setWatchListDtl] = useState<IWatchList | null>(null);
     const [watchListDtlID, setWatchListDtlID] = useState<number>(-1);
     const [watchListDtlLoadingStarted, setWatchListDtlLoadingStarted] = useState(false);
     const [watchListDtlLoadingComplete, setWatchListDtlLoadingComplete] = useState(false);
     const [watchListItemDtlID, setWatchListItemDtlID] = useState<number>(0);

     const router = useRouter();

     const defaultProps = {
          options: formattedNames,
          getOptionLabel: (option: IAutoCompleteOption) => option?.name.toString(),
     };

     // When you go to add a WL, if you forgot to add the WLI, the Add Link will show the search so you can add it immediately. This only applies to adding a WL, not editing one.
     const addNewChangeHandler = () => {
          if (addModified && (addWatchListDtl?.WatchListItemID !== -1 || addWatchListDtl.StartDate !== getLocaleDate() || addWatchListDtl.EndDate !== "" || addWatchListDtl.WatchListSourceID !== -1 || addWatchListDtl.Season !== 0 || addWatchListDtl.Rating !== 0 || addWatchListDtl.Notes !== "")) {
               const confirmLeave = confirm("You have started to add a record. Are you sure you weant to leave ?");

               if (!confirmLeave) {
                    return;
               }
          } else if (editModified) {
               const confirmLeave = confirm("You have edited this record. Save it now ?");

               if (confirmLeave) {
                    updateWatchList(true);
               }
          }

          closeDetail();

          showSearch();
     };

     const addWatchListDetailChangeHandler = (fieldName: string, fieldValue: string | number) => {
          const newAddWatchListDtl = Object.assign({}, addWatchListDtl);

          newAddWatchListDtl[fieldName] = fieldValue;
          newAddWatchListDtl.IsModified = true;

          setAddWatchListDtl(newAddWatchListDtl);

          setAddModified(true);
     };

     const autoCompleteChangeHandler = (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
          if (event.target.innerText === "") {
               return;
          }

          const watchListItem = watchListItems.filter((watchListItem: IWatchListItem) => {
               const IMDB_JSON = watchListItem?.IMDB_JSON !== null && typeof watchListItem?.IMDB_JSON !== "undefined" ? JSON.parse(watchListItem?.IMDB_JSON) : null;

               let itemName = watchListItem.WatchListItemName + (IMDB_JSON !== null && IMDB_JSON.Year !== null ? ` (${IMDB_JSON.Year})` : ``);


               if (watchListItems?.filter((watchListItemDupe: IWatchListItem) => {
                    return String(watchListItemDupe.WatchListItemName) === String(watchListItem.WatchListItemName);
               }).length > 1) {
                    itemName += ` (${watchListItem.WatchListTypeName})`;
               }

               return itemName === event.target.innerText;
          });

          if (watchListItem.length === 1) {
               if (isAdding) {
                    const newAddWatchListDtl = Object.assign({}, addWatchListDtl);
                    newAddWatchListDtl["WatchListItemID"] = watchListItem[0].WatchListItemID;
                    newAddWatchListDtl["WatchListItem"] = watchListItem[0];
                    setAddWatchListDtl(newAddWatchListDtl);
                    setAddModified(true);
               } else if (isEditing) {
                    const newWatchListDtl = Object.assign({}, watchListDtl);
                    newWatchListDtl["WatchListItemID"] = watchListItem[0].WatchListItemID;
                    newWatchListDtl["WatchListItem"] = watchListItem[0];
                    newWatchListDtl[`WatchListItemIDIsModified`] = true;
                    setWatchListDtl(newWatchListDtl);
                    setEditModified(true);
               }

               setAutoComplete(null);
          }
     };

     const cancelClickHandler = async () => {
          setIsEditing(false);
          setWatchListDtl(originalWatchListDtl);
          setOriginalWatchListDtl(null);
          setAddModified(false);
          setEditModified(false);
     };

     const closeDetail = async () => {
          setAddWatchListDtl(null);
          setWatchListDtl(null);
          setOriginalWatchListDtl(null);

          if (addModified || editModified) {
               setWatchListLoadingStarted(false);
               setWatchListLoadingComplete(false);
               setWatchListSortingComplete(false);
          }

          router.push("/WatchList");
     };

     const getLocaleDate = useCallback(() => {
          const dateSpl = currentDate.split("/");

          if (navigator.languages.includes("en-US")) { // Date is in format mm/dd/yyyy
               return `${dateSpl[2]}-${dateSpl[0].padStart(2, '0')}-${dateSpl[1].padStart(2, '0')}`;
          } else { // Date is in format dd/mm/yyyy
               try {
                    return `${dateSpl[2]}-${dateSpl[1].padStart(2, '0')}-${dateSpl[0].padStart(2, '0')}`;
               } catch (e) {
                    return "";
               }
          }
     }, [currentDate]);

     const getRatingIcon = (index: number) => {
          if (addWatchListDtl === null) {
               return EmptyIconComponent;
          } else if (isAdding)
               return addWatchListDtl?.Rating > index + 0.5 ? FullIconComponent : addWatchListDtl?.Rating === index + 0.5 ? HalfIconComponent : EmptyIconComponent;
          else if (watchListDtl === null) {
               return EmptyIconComponent;
          }
          else {
               return watchListDtl?.Rating > index + 0.5 ? FullIconComponent : watchListDtl?.Rating === index + 0.5 ? HalfIconComponent : EmptyIconComponent;
          }
     };

     const getWatchListTypeID = (watchListItemID: number) => {
          const results = watchListItems?.filter((watchListItem: IWatchListItem) => {
               return String(watchListItem.WatchListItemID) === String(watchListItemID);
          });

          if (results.length === 1) {
               return results[0].WatchListTypeID;
          } else {
               return -1;
          }
     };

     const ratingClickHandler = (index: number) => {
          if (!isAdding && !isEditing) return true;

          if (addWatchListDtl === null) {
               return;
          }

          if (isAdding) {
               if (String(addWatchListDtl?.Rating + ".0") === String(index + ".0")) {
                    addWatchListDtl.Rating = index + 0.5;
               } else if (String(addWatchListDtl?.Rating) === String(index + ".5")) {
                    addWatchListDtl.Rating = parseFloat((index + 1).toFixed(1));
               } else {
                    addWatchListDtl.Rating = parseFloat(index.toFixed(1));
               }

               addWatchListDetailChangeHandler("Rating", addWatchListDtl.Rating);

               return;
          } else {
               if (watchListDtl !== null) {
                    const newWatchListDtl = Object.assign({}, watchListDtl);

                    if (newWatchListDtl.Rating === null) watchListDtl.Rating = 0;

                    if (String(watchListDtl.Rating + ".0") === String(index + ".0")) {
                         watchListDtl.Rating = index + 0.5;
                    } else if (String(watchListDtl.Rating) === String(index + ".5")) {
                         watchListDtl.Rating = parseFloat((index + 1).toFixed(1));
                    } else {
                         watchListDtl.Rating = parseFloat(index.toFixed(1));
                    }

                    watchListDetailChangeHandler("Rating", watchListDtl.Rating.toString());
               } else { // This shouldn't ever happen
                    console.log("watchListDtl is null in dtl for id" + watchListDtlID);
                    return;
               }
          }
     };

     const recommendationsClickHandler = () => {
          if (watchListDtl !== null) {
               setRecommendationName(watchListDtl.WatchListItemName);
               setRecommendationType(watchListDtl.WatchListTypeName);
          }
     };

     const saveClickHandler = async () => {
          if (demoMode) {
               alert("Saving is disabled in demo mode");
               return;
          }

          updateWatchList(false);
     };

     const saveNewClickHandler = async () => {
          if (demoMode) {
               alert("Adding is disabled in demo mode");
               return;
          }

          if (addWatchListDtl !== null) {
               if (addWatchListDtl.WatchListItemID === -1) {
                    alert("Please select the Movie or TV Show");
                    return;
               }

               if (addWatchListDtl.StartDate === "") {
                    alert("Please enter the start date");
                    return;
               }

               if (addWatchListDtl.WatchListSourceID === -1) {
                    alert("Please select the source");
                    return;
               }

               let queryURL = `/api/AddWatchList?WatchListItemID=${addWatchListDtl.WatchListItemID}&StartDate=${addWatchListDtl.StartDate.substring(0, 10)}&WatchListSourceID=${addWatchListDtl.WatchListSourceID}&Archived=${addWatchListDtl.Archived}`;

               if (addWatchListDtl.EndDate !== "") {
                    queryURL += `&EndDate=${addWatchListDtl.EndDate.substring(0, 10)}`;
               }

               if (addWatchListDtl.Season !== 0) {
                    queryURL += `&Season=${addWatchListDtl.Season}`;
               }

               if (addWatchListDtl.Rating != 0) {
                    queryURL += `&Rating=${addWatchListDtl.Rating}`;
               }

               if (addWatchListDtl.Notes !== "") {
                    queryURL += `&Notes=${addWatchListDtl.Notes}`;
               }

               axios.put(queryURL).then((res: AxiosResponse<IWatchList>) => {
                    if (res.data[0] === "ERROR") {
                         alert(`The error ${res.data[1]} occurred while adding the detail`);
                    } else {
                         setIsAdding(false);
                         setWatchListLoadingStarted(false);
                         setWatchListLoadingComplete(false);
                         setWatchListSortingComplete(false);

                         router.push("/WatchList");
                    }
               }).catch((err: Error) => {
                    alert(`The error ${err.message} occurred while adding the detail`);
               });
          } else { // This shouldn't ever happen
               alert("Unable to save new record. addWatchListDtl is null!");
          }
     };

     const startEditing = () => {
          setOriginalWatchListDtl(watchListDtl);
          setIsEditing(!isEditing);
     };

     const showDefaultSrc = () => {
          if (isAdding) {
               const newAddWatchListDtl = Object.assign([], addWatchListDtl);

               newAddWatchListDtl["IMDB_Poster_Error"] = true;

               setAddWatchListDtl(newAddWatchListDtl);
          } else {
               const newWatchListDtl = Object.assign([], watchListDtl);

               newWatchListDtl["IMDB_Poster_Error"] = true;

               setWatchListDtl(newWatchListDtl);
          }
     };

     const updateWatchList = (silent: boolean) => {
          if (watchListDtl !== null) {
               if (watchListDtl.WatchListItemID === -1) {
                    alert("Please select the Movie or TV Show");
                    return;
               }

               if (watchListDtl.StartDate === "") {
                    alert("Please enter the start date");
                    return;
               }

               if (watchListDtl.WatchListSourceID === -1) {
                    alert("Please select the source");
                    return;
               }

               let queryURL = ``;

               if (watchListDtl.WatchListItemIDIsModified === true) {
                    queryURL += `&WatchListItemID=${watchListDtl.WatchListItemID}`;
               }

               if (watchListDtl.WatchListSourceIDIsModified === true) {
                    queryURL += `&WatchListSourceID=${watchListDtl.WatchListSourceID}`;
               }

               if (watchListDtl.StartDateIsModified === true) {
                    // Fix start date formatting
                    if (watchListDtl.StartDate.toString().indexOf("-") === -1) {
                         watchListDtl.StartDate = `${watchListDtl.StartDate.substring(0, 4)}-${watchListDtl.StartDate.substring(4, 6)}-${watchListDtl.StartDate.substring(6, 8)}`;
                    }

                    queryURL += `&StartDate=${watchListDtl.StartDate}`;
               }

               if (watchListDtl.EndDateIsModified === true) {
                    // Fix end date formatting
                    if (watchListDtl.EndDate.toString().indexOf("-") === -1) {
                         watchListDtl.EndDate = `${watchListDtl.EndDate.substring(0, 4)}-${watchListDtl.EndDate.substring(4, 6)}-${watchListDtl.EndDate.substring(6, 8)}`;
                    }

                    queryURL += `&EndDate=${watchListDtl.EndDate.substring(0, 10)}`;
               }

               if (watchListDtl.SeasonIsModified === true) {
                    queryURL += `&Season=${watchListDtl.Season}`;
               }

               if (watchListDtl.ArchivedIsModified === true) {
                    queryURL += `&Archived=${watchListDtl.Archived}`;
               }

               if (watchListDtl.RatingIsModified === true) {
                    queryURL += `&Rating=${watchListDtl.Rating}`;
               }

               if (watchListDtl.NotesIsModified === true) {
                    queryURL += `&Notes=${watchListDtl.Notes}`;
               }

               if (queryURL != "") {
                    queryURL = `/api/UpdateWatchList?WatchListID=${watchListDtl.WatchListID}${queryURL}`;

                    axios.put(queryURL).then((res: AxiosResponse<IWatchList>) => {
                         if (res.data[0] === "ERROR") {
                              alert(`The error ${res.data[1]} occurred while updating the detail`);
                         } else {
                              setIsEditing(false);
                         }
                    }).catch((err: Error) => {
                         if (!silent) {
                              alert(`The error ${err.message} occurred while updating the detail`);
                         }
                    });
               } else {
                    setIsEditing(false);
               }
          }
     }

     const watchListDetailChangeHandler = (fieldName: string, fieldValue: boolean | string) => {
          const newWatchListDtl = Object.assign({}, watchListDtl);

          newWatchListDtl[fieldName] = fieldValue;
          newWatchListDtl[`${fieldName}IsModified`] = true;

          if (fieldName === "WatchListItemID") {
               if (demoMode) {
                    const demoWatchListItemsPayload = require("../../demo/index").demoWatchListItemsPayload;

                    const demoWatchListItem = demoWatchListItemsPayload.filter((watchListItem: IWatchListItem) => {
                         return String(watchListItem.WatchListItemID) === String(fieldValue);
                    });

                    if (demoWatchListItem.length === 1) {
                         newWatchListDtl["WatchListItem"] = demoWatchListItem[0];
                    }
               } else {
                    const watchListItem = watchListItems?.filter((watchListItem: IWatchListItem) => {
                         return String(watchListItem.WatchListItemID) === String(fieldValue);
                    });

                    if (watchListItem.length === 1) {
                         newWatchListDtl["WatchListItem"] = watchListItem[0];
                    }
               }
          }

          setWatchListDtl(newWatchListDtl);

          setEditModified(true);
     };

     const imdbImage = typeof watchListDtl?.IMDB_Poster !== "undefined" && watchListDtl?.IMDB_Poster !== null && watchListDtl?.IMDB_Poster_Error !== true && watchListDtl?.IMDB_Poster !== "" && watchListDtl?.IMDB_Poster.length > 0
          ?
          <Image className="poster-detail" width="175" height="200" alt="Image Not Available" src={watchListDtl?.IMDB_Poster} onError={() => showDefaultSrc()} />
          :
          <>{BrokenImageIconComponent}</>;

     useEffect(() => {
          if (!isAdding && !watchListDtlLoadingStarted && !watchListDtlLoadingComplete && watchListDtlID !== -1 && watchListDtlID !== -1 && !isNaN(watchListDtlID)) {
               setWatchListDtlLoadingStarted(true);

               if (demoMode && watchListDtlID !== -1) {
                    const demoWatchListPayload = require("../../demo/index").demoWatchListPayload;

                    const detailWatchList = demoWatchListPayload.filter((currentWatchList: IWatchList) => {
                         return String(currentWatchList.WatchListID) === String(watchListDtlID);
                    });

                    // This should never happen
                    if (detailWatchList.length !== 1) {
                         alert("Unable to get the detail");
                         return;
                    }

                    setWatchListDtl(detailWatchList[0]);
                    setWatchListDtlLoadingStarted(true);
                    setWatchListDtlLoadingComplete(true);

                    return;
               }

               axios.get(`/api/GetWatchListDtl?WatchListID=${watchListDtlID}`)
                    .then((res: AxiosResponse<IWatchList>) => {
                         if (res.data[0] === "ERROR") {
                              setErrorMessage(`The error ${res.data[1]} occurred while getting the detail`);
                              setIsError(true);
                              return;
                         } else {
                              // Sanitize object by replacing all fields with null
                              const wld = res.data[1];

                              if (wld[0]?.IMDB_JSON !== null && typeof wld[0]?.IMDB_JSON !== "undefined") {
                                   const IMDB_JSON = (JSON.parse(wld[0]?.IMDB_JSON));

                                   const tooltip = IMDB_JSON && IMDB_JSON !== null &&
                                        `Rated: ${IMDB_JSON.Rated} 
Year: ${IMDB_JSON.Year}
Rated: ${IMDB_JSON.imdbRating}
Genre: ${IMDB_JSON.Genre}
Runtime: ${IMDB_JSON.Runtime}
Release Date: ${IMDB_JSON.Released}
Director: ${IMDB_JSON.Director}
Plot: ${IMDB_JSON.Plot}
${typeof IMDB_JSON.totalSeasons !== "undefined" ? `Seasons: ${IMDB_JSON.totalSeasons}` : ""}
     `;

                                   wld[0].Tooltip = tooltip;
                              }

                              Object.keys(wld[0]).map((keyName) => {
                                   if (wld[0][keyName] === null) {
                                        wld[0][keyName] = "";
                                   }
                              });

                              setWatchListDtl(wld[0]);
                              setWatchListDtlLoadingComplete(true);
                         }
                    })
                    .catch((err: Error) => {
                         setErrorMessage(`The fatal error ${err.message} occurred while getting the detail`);
                         setIsError(true);
                    });
          } else if (isAdding) {
               const newAddWatchListDtl: IWatchList = {} as IWatchList;
               newAddWatchListDtl.WatchListItemID = watchListItemDtlID !== null ? watchListItemDtlID : -1;
               newAddWatchListDtl.StartDate = getLocaleDate();
               newAddWatchListDtl.EndDate = "";
               newAddWatchListDtl.WatchListSourceID = -1;
               newAddWatchListDtl.Season = 0;
               newAddWatchListDtl.Rating = 0;
               newAddWatchListDtl.Notes = "";

               setAddWatchListDtl(newAddWatchListDtl);
          }
     }, [demoMode, getLocaleDate, isAdding, setErrorMessage, setIsError, watchListDtl, watchListDtlID, watchListDtlLoadingStarted, watchListDtlLoadingComplete, watchListItemDtlID]);

     useEffect(() => {
          if (watchListItems.length > 0) {
               // Generate names for auto complete
               const namesOnlyItems: IAutoCompleteOption[] = watchListItems.map((watchListItem: IWatchListItem) => {
                    const IMDB_JSON = watchListItem?.IMDB_JSON !== null && typeof watchListItem?.IMDB_JSON !== "undefined" ? JSON.parse(watchListItem?.IMDB_JSON) : null;

                    let itemName = watchListItem.WatchListItemName + (IMDB_JSON !== null && IMDB_JSON.Year !== null ? ` (${IMDB_JSON.Year})` : ``);


                    if (watchListItems?.filter((watchListItemDupe: IWatchListItem) => {
                         return String(watchListItemDupe.WatchListItemName) === String(watchListItem.WatchListItemName);
                    }).length > 1) {
                         itemName += ` (${watchListItem.WatchListTypeName})`;
                    }

                    return { name: itemName };
               });

               const namesWithIdSorted = namesOnlyItems.sort();

               setFormattedNames(namesWithIdSorted);

               const namesWithIdItems = watchListItems.map((watchListItem: IWatchListItem) => {
                    let itemName = watchListItem.WatchListItemName

                    if (watchListItems?.filter((watchListItemDupe: IWatchListItem) => {
                         return String(watchListItemDupe.WatchListItemName) === String(watchListItem.WatchListItemName);
                    }).length > 1) {
                         itemName += " (" + watchListItem.WatchListTypeName + ")"
                    }

                    let newItem: AutoCompleteWatchListItem = {
                         WatchListItemID: watchListItem.WatchListItemID,
                         WatchListItemName: itemName
                    }

                    return newItem;
               });

               const namesWithIdItemsSorted = namesWithIdItems.sort((a: IWatchListItem, b: IWatchListItem) => {
                    // Convert names to lowercase for case-insensitive sorting
                    const nameA = a.WatchListItemName.toLowerCase().trim();
                    const nameB = b.WatchListItemName.toLowerCase().trim();

                    // Compare the names
                    if (nameA < nameB) {
                         return -1;
                    }
                    if (nameA > nameB) {
                         return 1;
                    }

                    // Names are equal
                    return 0;
               });

               setFormattedNamesWithId(namesWithIdItemsSorted);
          }
     }, [watchListItems]);

     useEffect(() => {
          if (recommendationName !== "" && recommendationType !== "") {
               setRecommendationsVisible(true);
          }
     }, [recommendationName, recommendationType]);

     useEffect(() => {
          const searchParams = window.location.search.replace("?", "&").split("&");

          for (let i = 0; i < searchParams.length; i++) {
               if (searchParams[i] !== "") {
                    const paramSpl = searchParams[i].split("=");

                    if (paramSpl[0] === "WatchListID" && paramSpl[1] !== "") {
                         setWatchListDtlID(parseInt(paramSpl[1], 10));
                    } else if (paramSpl[0] === "WatchListItemID" && paramSpl[1] !== "") {
                         setWatchListItemDtlID(parseInt(paramSpl[1], 10));
                    }
               }
          }
     }, []);

     return (
          <div className="modal">
               <div className={`modal-content ${watchListDtlID != null ? "fade-in" : "fade-out"}${!darkMode ? " lightMode" : " darkMode"}`}>
                    {!recommendationsVisible &&
                         <div className="container">
                              <div className="cards">
                                   <div className="narrow card">
                                        {!isAdding && !isEditing &&
                                             <span onClick={startEditing}>
                                                  <span className={`clickable editsaveCancelButton ${!darkMode ? " lightMode" : " darkMode"}`}>{EditIconComponent}</span>
                                             </span>
                                        }

                                        {(isAdding || isEditing) &&
                                             <span className={`clickable saveIcon${!darkMode ? " lightMode" : " darkMode"}`} onClick={isAdding ? saveNewClickHandler : saveClickHandler}>
                                                  {SaveIconComponent}
                                             </span>
                                        }
                                   </div>

                                   <div className="labelWidth card">
                                        {!isAdding && !isEditing &&
                                             <>
                                                  {typeof watchListDtl?.IMDB_URL !== "undefined" &&
                                                       <a className={`linkStyle text-label${!darkMode ? " lightMode" : " darkMode"}`} href={watchListDtl?.IMDB_URL} target='_blank' title={watchListDtl?.Tooltip}>{watchListDtl?.WatchListItemName}</a>
                                                  }

                                                  {typeof watchListDtl?.IMDB_URL === "undefined" &&
                                                       <div title={watchListDtl?.Tooltip} className={`${!darkMode ? "lightMode" : "darkMode"}`}>
                                                            {watchListDtl?.WatchListItemName}
                                                       </div>
                                                  }

                                                  {watchListDtl?.Archived === 1 ? <span className={`${!darkMode ? "lightMode" : "darkMode"}`}>&nbsp;(A)</span> : <></>}
                                             </>
                                        }

                                        {(isEditing || isAdding) && formattedNames &&
                                             <div className="narrow card">
                                                  <Autocomplete id="wl_autocomplete" className={`labelWidth lightMode`} size="small" sx={{ width: 250, height: 40 }} {...defaultProps} options={formattedNames} value={autoComplete} onChange={(event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => autoCompleteChangeHandler(event)} renderInput={(params: TextFieldProps) => <TextField {...params} label="Search" />} />
                                             </div>
                                        }
                                   </div>

                                   <div className="narrow card rightAligned">
                                        {!isAdding && !isEditing &&
                                             <span className={`clickable closeButton ${!darkMode ? " lightMode" : "darkMode"}`} onClick={closeDetail}>
                                                  X
                                             </span>
                                        }

                                        {(isAdding || isEditing) &&
                                             <span className={`clickable cancelIcon${!darkMode ? " lightMode" : " darkMode"}`} onClick={isAdding ? closeDetail : cancelClickHandler}>
                                                  {CancelIconComponent}
                                             </span>
                                        }
                                   </div>

                                   <div className="narrow card">
                                        {!isAdding &&
                                             <>
                                                  {imdbImage}
                                             </>
                                        }

                                        {isAdding && addWatchListDtl && watchListItems?.filter((currentWatchListItem: IWatchListItem) => String(currentWatchListItem?.WatchListItemID) === String(addWatchListDtl?.WatchListItemID)).length === 1 &&
                                             <span className="column"><Image className="poster-detail" width="175" height="200" alt="Image Not Available" src={watchListItems?.filter((currentWatchListItem: IWatchListItem) => String(currentWatchListItem?.WatchListItemID) === String(addWatchListDtl?.WatchListItemID))[0].IMDB_Poster ?? ""} /></span>
                                        }
                                   </div>

                                   {!isAdding && !isEditing &&
                                        <>
                                             <div className="narrow card"></div>
                                             <div className="narrow card"></div>
                                        </>
                                   }

                                   {isAdding && addWatchListDtl &&
                                        <div className="narrow card">
                                             <select className="selectStyle editing" autoFocus value={addWatchListDtl?.WatchListItemID} onChange={(event) => addWatchListDetailChangeHandler("WatchListItemID", event.target.value)}>
                                                  <option value="-1">Please select</option>

                                                  {formattedNamesWithId && formattedNamesWithId.map((watchListItem: IWatchListItem, index: number) => {
                                                       return (
                                                            <option key={index} value={watchListItem?.WatchListItemID}>
                                                                 {watchListItem?.WatchListItemName}
                                                            </option>
                                                       )
                                                  })}
                                             </select>
                                        </div>
                                   }

                                   {isEditing &&
                                        <div className="narrow card">
                                             <select className="selectStyle editing" autoFocus value={watchListDtl?.WatchListItemID} onChange={(event) => watchListDetailChangeHandler("WatchListItemID", event.target.value)}>
                                                  <option value="-1">Please select</option>

                                                  {watchListItems?.sort((a: IWatchListItem, b: IWatchListItem) => {
                                                       return String(a.WatchListItemName) > String(b.WatchListItemName) ? (watchListSortDirection === "ASC" ? 1 : -1) : watchListSortDirection === "ASC" ? -1 : 1;
                                                  }).map((watchListItem: IWatchListItem, index: number) => {
                                                       return (
                                                            <option key={index} value={watchListItem.WatchListItemID}>
                                                                 {watchListItem.WatchListItemName}
                                                            </option>
                                                       );
                                                  })}
                                             </select>
                                        </div>
                                   }

                                   <div className="narrow card">
                                        {((isAdding && addWatchListDtl) || isEditing) &&
                                             <div className="clickable hyperlink text-label rightAligned" onClick={addNewChangeHandler}>Add</div>
                                        }
                                   </div>

                                   {(isAdding || isEditing) &&
                                        <div className="narrow card"></div>
                                   }

                                   <div className="narrow card">
                                        <span className={`textLabel ${!darkMode ? " lightMode" : "darkMode"}`}>Start Date:&nbsp;</span>
                                   </div>

                                   <div className="labelWidth narrow card">
                                        {!isAdding && !isEditing &&
                                             <span className={`${!darkMode ? " lightMode" : " darkMode"}`}>{watchListDtl?.StartDate && watchListDtl?.StartDate}</span>
                                        }

                                        {isEditing &&
                                             <input className={`lightMode`} type="date" value={watchListDtl?.StartDate !== null ? watchListDtl?.StartDate : ""} onChange={(event) => watchListDetailChangeHandler("StartDate", event.target.value)} />
                                        }

                                        {isAdding && addWatchListDtl &&
                                             <input className={`lightMode`} type="date" value={addWatchListDtl?.StartDate} onChange={(event) => addWatchListDetailChangeHandler("StartDate", event.target.value)} />
                                        }
                                   </div>

                                   <div className="narrow card"></div>

                                   <div className="narrow card">
                                        <span className={`textLabel ${!darkMode ? " lightMode" : " darkMode"}`}>End Date:&nbsp;</span>
                                   </div>

                                   <div className="labelWidth narrow card">
                                        {!isAdding && !isEditing &&
                                             <span className={`${!darkMode ? "lightMode" : "darkMode"}`}>{watchListDtl?.EndDate && watchListDtl?.EndDate}</span>
                                        }

                                        {isEditing &&
                                             <input className={`lightMode`} type="date" value={watchListDtl?.EndDate !== null ? watchListDtl?.EndDate : ""} onChange={(event) => watchListDetailChangeHandler("EndDate", event.target.value)} />
                                        }

                                        {isAdding && addWatchListDtl &&
                                             <input className={`lightMode`} type="date" value={addWatchListDtl?.EndDate} onChange={(event) => addWatchListDetailChangeHandler("EndDate", event.target.value)} />
                                        }
                                   </div>

                                   <div className="narrow card"></div>

                                   <div className="narrow card">
                                        <div className={`textLabel ${!darkMode ? " lightMode" : "darkMode"}`}>Source:</div>
                                   </div>

                                   <div className="narrow card">
                                        {!isAdding && !isEditing &&
                                             <div className={`${!darkMode ? " lightMode" : "darkMode"}`}>{watchListDtl?.WatchListSourceName}</div>
                                        }

                                        {isEditing &&
                                             <select className="selectStyle" value={watchListDtl?.WatchListSourceID} onChange={(event) => watchListDetailChangeHandler("WatchListSourceID", event.target.value)}>
                                                  <option value="-1">Please select</option>

                                                  {watchListSources?.map((watchListSource: IWatchListSource, index: number) => {
                                                       return (
                                                            <option key={index} value={watchListSource?.WatchListSourceID}>
                                                                 {watchListSource?.WatchListSourceName}
                                                            </option>
                                                       );
                                                  })}
                                             </select>
                                        }

                                        {isAdding && addWatchListDtl &&
                                             <select className="selectStyle" value={addWatchListDtl?.WatchListSourceID} onChange={(event) => addWatchListDetailChangeHandler("WatchListSourceID", event.target.value)}>
                                                  <option value="-1">Please select</option>

                                                  {watchListSources?.map((watchListSource: IWatchListSource, index: number) => {
                                                       return (
                                                            <option key={index} value={watchListSource?.WatchListSourceID}>
                                                                 {watchListSource?.WatchListSourceName}
                                                            </option>
                                                       );
                                                  })}
                                             </select>
                                        }
                                   </div>

                                   {((isAdding && addWatchListDtl !== null && addWatchListDtl?.WatchListItemID !== -1 && getWatchListTypeID(addWatchListDtl.WatchListItemID) === 2) || (!isAdding && watchListDtl?.WatchListTypeID === 2)) &&
                                        <>
                                             <div className="narrow card"></div>

                                             <div className="narrow card">
                                                  <div className={`textLabel ${!darkMode ? " lightMode" : "darkMode"}`}>Season:</div>
                                             </div>

                                             <div className="narrow card">
                                                  {!isAdding && !isEditing &&
                                                       <div>{watchListDtl?.Season}</div>
                                                  }

                                                  {isEditing &&
                                                       <input className={`inputStyle narrowWidth lightMode`} type="number" value={watchListDtl?.Season !== null ? watchListDtl?.Season : ""} onChange={(event) => watchListDetailChangeHandler("Season", event.target.value)} />
                                                  }

                                                  {isAdding && addWatchListDtl &&
                                                       <input className={`inputStyle narrowWidth lightMode`} type="number" value={addWatchListDtl?.Season} onChange={(event) => addWatchListDetailChangeHandler("Season", event.target.value)} />
                                                  }
                                             </div>
                                        </>
                                   }

                                   <div className="narrow card"></div>

                                   <div className="narrow card">
                                        <div className={`textLabel ${!darkMode ? " lightMode" : "darkMode"}`}>Notes:</div>
                                   </div>

                                   <div className="narrow card no-width">
                                        {!isAdding && !isEditing &&
                                             <div className={`${!darkMode ? "lightMode" : "darkMode"}`}>{watchListDtl?.Notes}</div>
                                        }

                                        {isEditing &&
                                             <input className={`inputStyle lightMode`} value={watchListDtl?.Notes} onChange={(event) => watchListDetailChangeHandler("Notes", event.target.value)} />
                                        }

                                        {isAdding && addWatchListDtl &&
                                             <input className={`inputStyle lightMode`} value={addWatchListDtl?.Notes} onChange={(event) => addWatchListDetailChangeHandler("Notes", event.target.value)} />
                                        }
                                   </div>

                                   <div className="narrow card">
                                        {!isAdding && !isEditing && recommendationsEnabled &&
                                             <div className={`clickable hyperlink text-label rightAligned`} onClick={recommendationsClickHandler}>Recommendations</div>
                                        }
                                   </div>

                                   <div className="narrow card">
                                        <div className={`textLabel ${!darkMode ? " lightMode" : "darkMode"}`}>Rating:</div>
                                   </div>

                                   <div className="labelWidth narrow card">
                                        {!isAdding && !isEditing &&
                                             <span className={`${!darkMode ? "lightMode" : "darkMode"}`}>
                                                  {Array.from(Array(ratingMax), (e: Event, index: number) => {
                                                       return (
                                                            <span className="favoriteIcon" key={index}>
                                                                 {getRatingIcon(index)}
                                                            </span>
                                                       );
                                                  })}
                                             </span>
                                        }

                                        {isEditing &&
                                             <span className={`customTopMargin clickable ${!darkMode ? "lightMode" : "darkMode"}`}>
                                                  {Array.from(Array(ratingMax), (e, index) => {
                                                       return (
                                                            <span className="favoriteIcon" key={index} onClick={() => ratingClickHandler(index)}>
                                                                 {getRatingIcon(index)}
                                                            </span>
                                                       );
                                                  })}
                                             </span>
                                        }

                                        {isAdding && addWatchListDtl &&
                                             <span className={`customTopMargin clickable ${!darkMode ? "lightMode" : "darkMode"}`}>
                                                  {Array.from(Array(ratingMax), (e, index) => {
                                                       return (
                                                            <span className="favoriteIcon" key={index} onClick={() => ratingClickHandler(index)}>
                                                                 {getRatingIcon(index)}
                                                            </span>
                                                       );
                                                  })}
                                             </span>
                                        }
                                   </div>

                                   {(isAdding || isEditing) &&
                                        <>
                                             <div className="narrow card"></div>

                                             <div className="narrow card">
                                                  <div className={`textLabel ${!darkMode ? " lightMode" : " darkMode"}`}>Archive:</div>
                                             </div>

                                             {isAdding &&
                                                  <div className="narrow card">
                                                       <input className={`lightMode`} type="checkbox" checked={addWatchListDtl?.Archived === 1 ? true : false} onChange={(event) => addWatchListDetailChangeHandler("Archived", event.target.value)} />
                                                  </div>

                                             }

                                             {isEditing &&
                                                  <div className="narrow card">
                                                       <input className={`lightMode`} type="checkbox" checked={watchListDtl?.Archived === 1 ? true : false} onChange={(event: React.ChangeEvent<HTMLInputElement>) => watchListDetailChangeHandler("Archived", event.target.checked)} />
                                                  </div>
                                             }
                                        </>
                                   }
                              </div>
                         </div>
                    }

                    {recommendationsVisible && (
                         <Recommendations queryTerm={recommendationName} type={recommendationType} setRecommendationName={setRecommendationName} setRecommendationType={setRecommendationName} setRecommendationsVisible={setRecommendationsVisible} />
                    )}
               </div>
          </div>
     )
}